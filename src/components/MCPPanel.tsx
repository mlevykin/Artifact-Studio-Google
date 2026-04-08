import React, { useState } from 'react';
import { 
  Network, 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  ToggleLeft, 
  ToggleRight,
  Globe,
  ShieldCheck,
  ShieldAlert,
  Key,
  Lock,
  RefreshCw,
  Wrench,
  Info,
  ExternalLink
} from 'lucide-react';
import { MCPConfig } from '../types';
import { cn, generateId } from '../utils';
import { MCPService } from '../services/mcpService';

interface MCPPanelProps {
  configs: MCPConfig[];
  onUpdateConfig: (config: MCPConfig) => void;
  onAddConfig: (config: MCPConfig) => void;
  onDeleteConfig: (id: string) => void;
  activeMcpIds: string[];
  onToggleMcp: (id: string) => void;
  autoSelectSkills: boolean;
}

export const MCPPanel: React.FC<MCPPanelProps> = ({
  configs,
  onUpdateConfig,
  onAddConfig,
  onDeleteConfig,
  activeMcpIds,
  onToggleMcp,
  autoSelectSkills
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState<string | null>(null);
  const [newConfig, setNewConfig] = useState<Partial<MCPConfig>>({
    name: '',
    url: '',
    enabled: true,
    authType: 'none',
    apiKey: '',
    oauthConfig: {
      clientId: '',
      clientSecret: '',
      authUrl: '',
      tokenUrl: '',
      scope: ''
    }
  });

  const handleSave = () => {
    if (editingId) {
      const config = configs.find(c => c.id === editingId);
      if (config) {
        onUpdateConfig({ ...config, ...newConfig } as MCPConfig);
      }
      setEditingId(null);
    } else {
      onAddConfig({
        id: generateId(),
        name: newConfig.name || 'Untitled Server',
        url: newConfig.url || '',
        enabled: true,
        authType: newConfig.authType || 'none',
        apiKey: newConfig.apiKey,
        oauthConfig: newConfig.oauthConfig as any
      } as MCPConfig);
      setIsAdding(false);
    }
    setNewConfig({ 
      name: '', 
      url: '', 
      enabled: true, 
      authType: 'none',
      apiKey: '',
      oauthConfig: {
        clientId: '',
        clientSecret: '',
        authUrl: '',
        tokenUrl: '',
        scope: ''
      }
    });
  };

  const startEditing = (config: MCPConfig) => {
    setEditingId(config.id);
    setNewConfig(config);
    setIsAdding(true);
  };

  const handleTestConnection = async (config: MCPConfig) => {
    setIsTesting(config.id);
    try {
      const { tools } = await MCPService.connect(config);
      onUpdateConfig({
        ...config,
        status: 'connected',
        tools,
        error: undefined
      });
    } catch (error: any) {
      onUpdateConfig({
        ...config,
        status: 'error',
        error: error.message || 'Failed to connect'
      });
    } finally {
      setIsTesting(null);
    }
  };

  const handleAuthorize = (config: MCPConfig) => {
    if (!config.oauthConfig) return;
    
    const { authUrl, clientId, scope } = config.oauthConfig;
    const redirectUri = `${window.location.origin}/auth-callback.html`;
    
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scope,
      state: config.id
    });

    const url = `${authUrl}?${params.toString()}`;
    const authWindow = window.open(url, 'mcp_oauth', 'width=600,height=700');
    
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data?.type === 'MCP_OAUTH_SUCCESS' && event.data.state === config.id) {
        const { code } = event.data;
        window.removeEventListener('message', handleMessage);
        
        try {
          setIsTesting(config.id);
          const tokens = await MCPService.exchangeCodeForTokens(config, code, redirectUri);
          onUpdateConfig({
            ...config,
            oauthConfig: {
              ...config.oauthConfig!,
              accessToken: tokens.access_token,
              refreshToken: tokens.refresh_token,
              expiresAt: Date.now() + (tokens.expires_in * 1000)
            }
          });
          alert('OAuth authorization successful!');
        } catch (error: any) {
          alert(`Failed to exchange code for tokens: ${error.message}`);
        } finally {
          setIsTesting(null);
        }
      } else if (event.data?.type === 'MCP_OAUTH_ERROR' && event.data.state === config.id) {
        window.removeEventListener('message', handleMessage);
        alert(`OAuth authorization failed: ${event.data.error}`);
      }
    };

    window.addEventListener('message', handleMessage);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900 text-zinc-300">
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-white">
          <Network size={18} />
          MCP SERVERS
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
        >
          <Plus size={18} />
        </button>
      </div>

      <div className="p-4 bg-zinc-950/50 border-b border-zinc-800">
        <p className="text-[10px] text-zinc-500 leading-relaxed">
          Model Context Protocol (MCP) allows the AI to access external tools and data sources.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-4 space-y-3">
        {configs.map(config => (
          <div 
            key={config.id}
            className={cn(
              "group flex flex-col gap-2 p-3 rounded-xl transition-all border",
              config.enabled 
                ? "bg-zinc-800/50 border-zinc-700/50" 
                : "bg-zinc-900/30 border-transparent opacity-60"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Globe size={14} className={config.enabled ? "text-indigo-400" : "text-zinc-600"} />
                <span className="text-sm font-medium truncate text-zinc-200">{config.name}</span>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleTestConnection(config)}
                  disabled={isTesting === config.id}
                  className="p-1 text-zinc-500 hover:text-emerald-400 transition-colors disabled:opacity-50"
                  title="Test Connection"
                >
                  <RefreshCw size={14} className={isTesting === config.id ? "animate-spin" : ""} />
                </button>
                <button 
                  onClick={() => onToggleMcp(config.id)}
                  disabled={autoSelectSkills || !config.enabled}
                  className={cn(
                    "p-1 transition-colors",
                    activeMcpIds.includes(config.id) ? "text-amber-500" : "text-zinc-500 hover:text-zinc-300",
                    (autoSelectSkills || !config.enabled) && "opacity-50 cursor-not-allowed"
                  )}
                  title={autoSelectSkills ? "Auto-select is enabled" : (!config.enabled ? "Server is globally disabled" : (activeMcpIds.includes(config.id) ? "Disable for this chat" : "Enable for this chat"))}
                >
                  {activeMcpIds.includes(config.id) ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                </button>
                <button 
                  onClick={() => onUpdateConfig({ ...config, enabled: !config.enabled })}
                  className={cn(
                    "p-1 transition-colors",
                    config.enabled ? "text-indigo-400" : "text-zinc-500 hover:text-zinc-300"
                  )}
                  title={config.enabled ? "Globally Enabled" : "Globally Disabled"}
                >
                  {config.enabled ? <Check size={14} /> : <X size={14} />}
                </button>
                <button 
                  onClick={() => startEditing(config)}
                  className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <Edit2 size={14} />
                </button>
                <button 
                  onClick={() => onDeleteConfig(config.id)}
                  className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono text-zinc-500 truncate flex-1">{config.url}</span>
                {config.status === 'connected' ? (
                  <span className="flex items-center gap-1 text-[8px] font-bold text-emerald-500 uppercase tracking-widest">
                    <ShieldCheck size={10} />
                  </span>
                ) : config.status === 'error' ? (
                  <span className="flex items-center gap-1 text-[8px] font-bold text-red-500 uppercase tracking-widest">
                    <ShieldAlert size={10} /> Error
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[8px] font-bold text-zinc-600 uppercase tracking-widest">
                    <ShieldAlert size={10} />
                  </span>
                )}
              </div>

              {config.error && (
                <div className="text-[9px] text-red-400 bg-red-500/10 p-1.5 rounded border border-red-500/20">
                  {config.error}
                </div>
              )}

              {config.status === 'connected' && config.tools && config.tools.length > 0 && (
                <div className="mt-1 space-y-1">
                  <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                    <Check size={10} className="text-emerald-500" />
                    Available Tools ({config.tools.length})
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {config.tools.slice(0, 5).map(tool => (
                      <span key={tool.name} className="text-[8px] bg-zinc-700/50 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700" title={tool.description}>
                        {tool.name}
                      </span>
                    ))}
                    {config.tools.length > 5 && (
                      <span className="text-[8px] text-zinc-500 px-1.5 py-0.5">+{config.tools.length - 5} more</span>
                    )}
                  </div>
                </div>
              )}

              {config.authType === 'oauth2' && !config.oauthConfig?.accessToken && (
                <button 
                  onClick={() => handleAuthorize(config)}
                  className="mt-1 w-full py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-[10px] font-bold rounded-lg border border-indigo-500/20 transition-all flex items-center justify-center gap-1.5"
                >
                  <Lock size={10} />
                  Authorize via OAuth2
                </button>
              )}
            </div>
          </div>
        ))}

        {configs.length === 0 && !isAdding && (
          <div className="py-12 text-center text-zinc-600">
            <Network size={32} className="mx-auto mb-3 opacity-20" />
            <p className="text-xs">No MCP servers configured</p>
            <button 
              onClick={() => setIsAdding(true)}
              className="mt-4 text-xs text-zinc-400 hover:text-white underline underline-offset-4"
            >
              Add your first server
            </button>
          </div>
        )}
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Network size={20} className="text-indigo-400" />
                {editingId ? 'Edit MCP Server' : 'New MCP Server'}
              </h3>
              <button onClick={() => setIsAdding(false)} className="text-zinc-500 hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Server Name</label>
                  <input 
                    type="text"
                    value={newConfig.name}
                    onChange={(e) => setNewConfig(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Local Tools Server"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Auth Type</label>
                  <select 
                    value={newConfig.authType}
                    onChange={(e) => setNewConfig(prev => ({ ...prev, authType: e.target.value as any }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors"
                  >
                    <option value="none">None</option>
                    <option value="apiKey">API Key</option>
                    <option value="oauth2">OAuth2</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Server URL (SSE or WebSocket)</label>
                <input 
                  type="text"
                  value={newConfig.url}
                  onChange={(e) => setNewConfig(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="http://localhost:3001/sse"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors"
                />
              </div>

              {newConfig.authType === 'apiKey' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Key size={10} /> API Key
                  </label>
                  <input 
                    type="password"
                    value={newConfig.apiKey}
                    onChange={(e) => setNewConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                    placeholder="Enter your API key"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors"
                  />
                </div>
              )}

              {newConfig.authType === 'oauth2' && (
                <div className="space-y-4 p-4 bg-zinc-950/50 rounded-2xl border border-zinc-800">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Client ID</label>
                      <input 
                        type="text"
                        value={newConfig.oauthConfig?.clientId}
                        onChange={(e) => setNewConfig(prev => ({ 
                          ...prev, 
                          oauthConfig: { ...prev.oauthConfig!, clientId: e.target.value } 
                        }))}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500/50"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Client Secret</label>
                      <input 
                        type="password"
                        value={newConfig.oauthConfig?.clientSecret}
                        onChange={(e) => setNewConfig(prev => ({ 
                          ...prev, 
                          oauthConfig: { ...prev.oauthConfig!, clientSecret: e.target.value } 
                        }))}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500/50"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Auth URL</label>
                    <input 
                      type="text"
                      value={newConfig.oauthConfig?.authUrl}
                      onChange={(e) => setNewConfig(prev => ({ 
                        ...prev, 
                        oauthConfig: { ...prev.oauthConfig!, authUrl: e.target.value } 
                      }))}
                      placeholder="https://example.com/oauth/authorize"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Token URL</label>
                    <input 
                      type="text"
                      value={newConfig.oauthConfig?.tokenUrl}
                      onChange={(e) => setNewConfig(prev => ({ 
                        ...prev, 
                        oauthConfig: { ...prev.oauthConfig!, tokenUrl: e.target.value } 
                      }))}
                      placeholder="https://example.com/oauth/token"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-zinc-800 bg-zinc-950/50 flex items-center justify-end gap-3">
              <button 
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={!newConfig.name || !newConfig.url}
                className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:hover:bg-indigo-500 text-white px-6 py-2 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20"
              >
                <Check size={18} />
                {editingId ? 'Update Server' : 'Add Server'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

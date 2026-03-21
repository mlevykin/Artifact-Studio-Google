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
  ShieldAlert
} from 'lucide-react';
import { MCPConfig } from '../types';
import { cn, generateId } from '../utils';

interface MCPPanelProps {
  configs: MCPConfig[];
  onUpdateConfig: (config: MCPConfig) => void;
  onAddConfig: (config: MCPConfig) => void;
  onDeleteConfig: (id: string) => void;
}

export const MCPPanel: React.FC<MCPPanelProps> = ({
  configs,
  onUpdateConfig,
  onAddConfig,
  onDeleteConfig
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newConfig, setNewConfig] = useState<Partial<MCPConfig>>({
    name: '',
    url: '',
    enabled: true
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
        enabled: true
      });
      setIsAdding(false);
    }
    setNewConfig({ name: '', url: '', enabled: true });
  };

  const startEditing = (config: MCPConfig) => {
    setEditingId(config.id);
    setNewConfig(config);
    setIsAdding(true);
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

      <div className="flex-1 overflow-y-auto px-2 py-4 space-y-2">
        {configs.map(config => (
          <div 
            key={config.id}
            className={cn(
              "group flex flex-col gap-1 p-3 rounded-xl transition-all border border-transparent",
              config.enabled 
                ? "bg-zinc-800/50 border-zinc-700/50" 
                : "hover:bg-zinc-800/30 opacity-60"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Globe size={14} className={config.enabled ? "text-indigo-400" : "text-zinc-600"} />
                <span className="text-sm font-medium truncate text-zinc-200">{config.name}</span>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => onUpdateConfig({ ...config, enabled: !config.enabled })}
                  className={cn(
                    "p-1 transition-colors",
                    config.enabled ? "text-indigo-400" : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  {config.enabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
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
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[9px] font-mono text-zinc-500 truncate flex-1">{config.url}</span>
              {config.enabled ? (
                <span className="flex items-center gap-1 text-[8px] font-bold text-emerald-500 uppercase tracking-widest">
                  <ShieldCheck size={10} /> Connected
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[8px] font-bold text-zinc-600 uppercase tracking-widest">
                  <ShieldAlert size={10} /> Disabled
                </span>
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
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Network size={20} className="text-indigo-400" />
                {editingId ? 'Edit MCP Server' : 'New MCP Server'}
              </h3>
              <button onClick={() => setIsAdding(false)} className="text-zinc-500 hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
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
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Server URL (SSE or WebSocket)</label>
                <input 
                  type="text"
                  value={newConfig.url}
                  onChange={(e) => setNewConfig(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="http://localhost:3001/sse"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors"
                />
              </div>
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

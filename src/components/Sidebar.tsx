import { Session, Skill, MCPConfig } from '../types';
import { cn, formatDate } from '../utils';
import { MessageSquare, Plus, Trash2, Database, Clock, ChevronLeft, Book, Network } from 'lucide-react';

interface SidebarProps {
  sessions: Session[];
  currentSessionId: string | null;
  onSessionSelect: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  provider: 'gemini' | 'ollama';
  onProviderChange: (provider: 'gemini' | 'ollama') => void;
  isOpen: boolean;
  onToggle: () => void;
  activeTab: 'chats' | 'skills' | 'mcp';
  onTabChange: (tab: 'chats' | 'skills' | 'mcp') => void;
  children?: React.ReactNode;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  currentSessionId,
  onSessionSelect,
  onNewSession,
  onDeleteSession,
  provider,
  onProviderChange,
  isOpen,
  onToggle,
  activeTab,
  onTabChange,
  children
}) => {
  // Estimate storage usage based on what will actually be persisted
  const sessionsToPersist = sessions.map(s => ({
    ...s,
    messages: s.messages.map(m => ({
      ...m,
      attachments: m.attachments?.filter(a => a.type !== 'image')
    }))
  }));
  const storageUsage = Math.round((JSON.stringify(sessionsToPersist).length / (5 * 1024 * 1024)) * 100);

  if (!isOpen) return null;

  return (
    <div className="w-72 h-full bg-zinc-900 text-zinc-300 flex flex-col border-r border-zinc-800 relative z-40">
      <div className="p-4 flex items-center justify-between border-b border-zinc-800/50">
        <div className="flex items-center gap-2 font-bold text-white tracking-tight">
          <div className="w-6 h-6 rounded bg-white text-zinc-900 flex items-center justify-center text-xs">A</div>
          ARTIFACTS
        </div>
        <button 
          onClick={onToggle}
          className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors"
          title="Collapse Sidebar"
        >
          <ChevronLeft size={18} />
        </button>
      </div>

      <div className="flex p-2 gap-1 bg-zinc-950/50 border-b border-zinc-800/50">
        <button 
          onClick={() => onTabChange('chats')}
          className={cn(
            "flex-1 flex flex-col items-center gap-1 py-2 rounded-xl transition-all",
            activeTab === 'chats' ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-400"
          )}
        >
          <MessageSquare size={16} />
          <span className="text-[9px] font-bold uppercase tracking-wider">Chats</span>
        </button>
        <button 
          onClick={() => onTabChange('skills')}
          className={cn(
            "flex-1 flex flex-col items-center gap-1 py-2 rounded-xl transition-all",
            activeTab === 'skills' ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-400"
          )}
        >
          <Book size={16} />
          <span className="text-[9px] font-bold uppercase tracking-wider">Skills</span>
        </button>
        <button 
          onClick={() => onTabChange('mcp')}
          className={cn(
            "flex-1 flex flex-col items-center gap-1 py-2 rounded-xl transition-all",
            activeTab === 'mcp' ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-400"
          )}
        >
          <Network size={16} />
          <span className="text-[9px] font-bold uppercase tracking-wider">MCP</span>
        </button>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'chats' ? (
          <>
            <div className="p-4 space-y-3">
              <button 
                onClick={onNewSession}
                className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl py-2.5 transition-all active:scale-95 shadow-lg border border-zinc-700"
              >
                <Plus size={18} />
                <span className="text-sm font-medium">New Chat</span>
              </button>

              <div className="flex p-1 bg-zinc-950 rounded-xl border border-zinc-800">
                <button 
                  onClick={() => onProviderChange('gemini')}
                  className={cn(
                    "flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all",
                    provider === 'gemini' ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-400"
                  )}
                >
                  GEMINI
                </button>
                <button 
                  onClick={() => onProviderChange('ollama')}
                  className={cn(
                    "flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all",
                    provider === 'ollama' ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-400"
                  )}
                >
                  OLLAMA
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2 space-y-1">
              <div className="px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Recent Chats
              </div>
              
              {sessions.length === 0 && (
                <div className="px-3 py-8 text-center text-zinc-600">
                  <MessageSquare size={24} className="mx-auto mb-2 opacity-20" />
                  <p className="text-xs">No history yet</p>
                </div>
              )}

              {sessions.map((s) => (
                <div 
                  key={s.id}
                  onClick={() => onSessionSelect(s.id)}
                  className={cn(
                    "group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all",
                    currentSessionId === s.id 
                      ? "bg-zinc-800 text-white shadow-md" 
                      : "hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  <MessageSquare size={16} className={cn(currentSessionId === s.id ? "text-zinc-200" : "text-zinc-600")} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{s.title}</div>
                    <div className="text-[10px] opacity-50 flex items-center gap-1">
                      <Clock size={10} />
                      {formatDate(s.lastUpdated)}
                    </div>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(s.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-hidden">
            {children}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-zinc-800 bg-zinc-950/50">
        <p className="text-[9px] text-zinc-600 leading-tight">
          Images are not stored in history to save space.
        </p>
      </div>
    </div>
  );
};

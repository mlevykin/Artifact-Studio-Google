import { useState } from 'react';
import { Session, Skill, MCPConfig, ChatFolder } from '../types';
import { cn, formatDate } from '../utils';
import { 
  MessageSquare, Plus, Trash2, Clock, ChevronLeft, 
  Book, Network, Folder, ChevronDown, ChevronRight,
  FolderPlus, Edit2, Move, X
} from 'lucide-react';

interface SidebarProps {
  sessions: Session[];
  folders: ChatFolder[];
  currentSessionId: string | null;
  onSessionSelect: (id: string) => void;
  onNewSession: (folderId?: string | null) => void;
  onDeleteSession: (id: string) => void;
  onMoveSession: (sessionId: string, folderId: string | null) => void;
  onCreateFolder: (name: string) => void;
  onUpdateFolder: (id: string, updates: Partial<ChatFolder>) => void;
  onDeleteFolder: (id: string) => void;
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
  folders,
  currentSessionId,
  onSessionSelect,
  onNewSession,
  onDeleteSession,
  onMoveSession,
  onCreateFolder,
  onUpdateFolder,
  onDeleteFolder,
  provider,
  onProviderChange,
  isOpen,
  onToggle,
  activeTab,
  onTabChange,
  children
}) => {
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState('');
  const [movingSessionId, setMovingSessionId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName('');
      setIsCreatingFolder(false);
    }
  };

  const handleStartEditFolder = (folder: ChatFolder) => {
    setEditingFolderId(folder.id);
    setEditFolderName(folder.name);
  };

  const handleSaveEditFolder = () => {
    if (editingFolderId && editFolderName.trim()) {
      onUpdateFolder(editingFolderId, { name: editFolderName.trim() });
      setEditingFolderId(null);
    }
  };

  const renderSession = (s: Session) => (
    <div 
      key={s.id}
      onClick={() => onSessionSelect(s.id)}
      className={cn(
        "group flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all relative",
        currentSessionId === s.id 
          ? "bg-zinc-800 text-white shadow-md" 
          : "hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-200"
      )}
    >
      <MessageSquare size={14} className={cn(currentSessionId === s.id ? "text-zinc-200" : "text-zinc-600")} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{s.title}</div>
        <div className="text-[9px] opacity-50 flex items-center gap-1">
          <Clock size={10} />
          {formatDate(s.lastUpdated)}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setMovingSessionId(movingSessionId === s.id ? null : s.id);
          }}
          className="p-1 hover:text-blue-400"
          title="Move to folder"
        >
          <Move size={12} />
        </button>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onDeleteSession(s.id);
          }}
          className="p-1 hover:text-red-400"
          title="Delete chat"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {movingSessionId === s.id && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50 py-1 overflow-hidden">
          <div className="px-3 py-1.5 text-[10px] font-bold text-zinc-500 uppercase border-b border-zinc-700 mb-1">
            Move to...
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onMoveSession(s.id, null);
              setMovingSessionId(null);
            }}
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-zinc-700 transition-colors flex items-center gap-2"
          >
            <MessageSquare size={12} />
            Root
          </button>
          {folders.map(f => (
            <button 
              key={f.id}
              onClick={(e) => {
                e.stopPropagation();
                onMoveSession(s.id, f.id);
                setMovingSessionId(null);
              }}
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-zinc-700 transition-colors flex items-center gap-2"
            >
              <Folder size={12} />
              {f.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const uncategorizedSessions = sessions.filter(s => !s.folderId);

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
              <div className="flex gap-2">
                <button 
                  onClick={() => onNewSession()}
                  className="flex-1 flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl py-2.5 transition-all active:scale-95 shadow-lg border border-zinc-700"
                >
                  <Plus size={18} />
                  <span className="text-sm font-medium">New Chat</span>
                </button>
                <button 
                  onClick={() => setIsCreatingFolder(true)}
                  className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-xl transition-all border border-zinc-700"
                  title="New Folder"
                >
                  <FolderPlus size={18} />
                </button>
              </div>

              {isCreatingFolder && (
                <div className="flex items-center gap-2 p-2 bg-zinc-950 rounded-xl border border-zinc-800 animate-in fade-in slide-in-from-top-1">
                  <input 
                    autoFocus
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateFolder();
                      if (e.key === 'Escape') setIsCreatingFolder(false);
                    }}
                    placeholder="Folder name..."
                    className="flex-1 bg-transparent border-none text-xs focus:ring-0 p-0 text-white"
                  />
                  <button onClick={handleCreateFolder} className="text-emerald-500 hover:text-emerald-400">
                    <Plus size={14} />
                  </button>
                  <button onClick={() => setIsCreatingFolder(false)} className="text-zinc-500 hover:text-zinc-400">
                    <X size={14} />
                  </button>
                </div>
              )}

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

            <div className="flex-1 overflow-y-auto px-2 space-y-1 pb-4">
              {/* Folders */}
              {folders.map(folder => {
                const folderSessions = sessions.filter(s => s.folderId === folder.id);
                return (
                  <div key={folder.id} className="space-y-1">
                    <div 
                      className="group flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-zinc-800/30 cursor-pointer transition-all"
                      onClick={() => onUpdateFolder(folder.id, { isExpanded: !folder.isExpanded })}
                    >
                      {folder.isExpanded ? <ChevronDown size={14} className="text-zinc-600" /> : <ChevronRight size={14} className="text-zinc-600" />}
                      <Folder size={14} className="text-zinc-500" />
                      
                      {editingFolderId === folder.id ? (
                        <input 
                          autoFocus
                          type="text"
                          value={editFolderName}
                          onChange={(e) => setEditFolderName(e.target.value)}
                          onBlur={handleSaveEditFolder}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEditFolder();
                            if (e.key === 'Escape') setEditingFolderId(null);
                          }}
                          className="flex-1 bg-zinc-950 border border-zinc-700 text-xs rounded px-1 py-0.5 text-white"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <div className="flex-1 text-xs font-bold text-zinc-400 truncate uppercase tracking-wider">
                          {folder.name}
                          <span className="ml-2 text-[10px] opacity-40 font-normal">({folderSessions.length})</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEditFolder(folder);
                          }}
                          className="p-1 hover:text-zinc-200"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteFolder(folder.id);
                          }}
                          className="p-1 hover:text-red-400"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    {folder.isExpanded && (
                      <div className="ml-4 pl-2 border-l border-zinc-800 space-y-1">
                        {folderSessions.length === 0 ? (
                          <div className="px-3 py-2 text-[10px] text-zinc-600 italic">Empty folder</div>
                        ) : (
                          folderSessions.map(renderSession)
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Uncategorized */}
              <div className="px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-4">
                Recent Chats
              </div>
              
              {sessions.length === 0 && (
                <div className="px-3 py-8 text-center text-zinc-600">
                  <MessageSquare size={24} className="mx-auto mb-2 opacity-20" />
                  <p className="text-xs">No history yet</p>
                </div>
              )}

              {uncategorizedSessions.map(renderSession)}
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

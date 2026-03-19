import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, X, Image as ImageIcon, FileText, Loader2, Menu, ChevronDown, ChevronUp, Diff } from 'lucide-react';
import { Message, Attachment } from '../types';
import { cn, generateId } from '../utils';
import { motion, AnimatePresence } from 'motion/react';

interface ChatPanelProps {
  messages: Message[];
  onSendMessage: (content: string, attachments: Attachment[]) => void;
  isStreaming: boolean;
  provider: 'gemini' | 'ollama';
  ollamaConfig: { baseUrl: string; selectedModel: string };
  availableModels: string[];
  onOllamaConfigChange: (config: { baseUrl?: string; selectedModel?: string }) => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ 
  messages, 
  onSendMessage, 
  isStreaming,
  provider,
  ollamaConfig,
  availableModels,
  onOllamaConfigChange,
  isSidebarOpen,
  onToggleSidebar
}) => {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showOllamaSettings, setShowOllamaSettings] = useState(false);
  const [expandedPatches, setExpandedPatches] = useState<Record<string, boolean>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const togglePatch = (messageId: string) => {
    setExpandedPatches(prev => ({ ...prev, [messageId]: !prev[messageId] }));
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if ((!input.trim() && attachments.length === 0) || isStreaming) return;
    onSendMessage(input, attachments);
    setInput('');
    setAttachments([]);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        alert(`File ${file.name} is too large (>10MB)`);
        continue;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const data = event.target?.result as string;
        const type = file.type.startsWith('image/') ? 'image' : 'text';
        
        const newAttachment: Attachment = {
          id: generateId(),
          type,
          name: file.name,
          data: type === 'image' ? data.split(',')[1] : data,
          mimeType: file.type
        };
        
        setAttachments(prev => [...prev, newAttachment]);
      };

      if (file.type.startsWith('image/')) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div className="flex flex-col h-full bg-zinc-50 border-r border-zinc-200 w-[400px] flex-shrink-0">
      <div className="p-4 border-b border-zinc-200 bg-white flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {!isSidebarOpen && (
              <button 
                onClick={onToggleSidebar}
                className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-500 hover:text-zinc-800 transition-colors"
                title="Expand Sidebar"
              >
                <Menu size={18} />
              </button>
            )}
            <h2 className="font-semibold text-zinc-800">Chat</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-[10px] font-bold px-2 py-0.5 rounded-full border",
              provider === 'gemini' ? "bg-indigo-50 text-indigo-600 border-indigo-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
            )}>
              {provider.toUpperCase()}
            </span>
            {provider === 'ollama' && (
              <button 
                onClick={() => setShowOllamaSettings(!showOllamaSettings)}
                className="p-1 hover:bg-zinc-100 rounded text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                <Loader2 size={14} className={cn(showOllamaSettings && "rotate-45")} />
              </button>
            )}
          </div>
        </div>

        {provider === 'ollama' && (
          <div className="flex items-center gap-2">
            <select 
              value={ollamaConfig.selectedModel}
              onChange={(e) => onOllamaConfigChange({ selectedModel: e.target.value })}
              className="flex-1 text-[10px] bg-zinc-100 border-none rounded-lg px-2 py-1 focus:ring-1 focus:ring-zinc-200 outline-none"
            >
              {availableModels.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        )}

        {showOllamaSettings && provider === 'ollama' && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="overflow-hidden space-y-2 pt-2 border-t border-zinc-100"
          >
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-zinc-400 uppercase">Ollama URL</label>
              <input 
                type="text"
                value={ollamaConfig.baseUrl}
                onChange={(e) => onOllamaConfigChange({ baseUrl: e.target.value })}
                className="text-[10px] bg-zinc-100 border-none rounded-lg px-2 py-1 focus:ring-1 focus:ring-zinc-200 outline-none"
                placeholder="http://localhost:11434"
              />
            </div>
          </motion.div>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-zinc-400 text-center p-8">
            <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mb-4">
              <Send size={20} />
            </div>
            <p className="text-sm">Start a conversation to generate artifacts.</p>
          </div>
        )}
        
        {messages.map((m) => (
          <div 
            key={m.id} 
            className={cn(
              "flex flex-col max-w-[85%]",
              m.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
            )}
          >
            <div 
              className={cn(
                "p-3 rounded-2xl text-sm",
                m.role === 'user' 
                  ? "bg-zinc-800 text-white rounded-tr-none" 
                  : "bg-white border border-zinc-200 text-zinc-800 rounded-tl-none shadow-sm"
              )}
            >
              {m.content}
              
              {m.patches && m.patches.length > 0 && (
                <div className="mt-3 pt-3 border-t border-zinc-100">
                  <button 
                    onClick={() => togglePatch(m.id)}
                    className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 hover:text-zinc-800 transition-colors"
                  >
                    <Diff size={12} />
                    APPLIED {m.patches.length} PATCHES
                    {expandedPatches[m.id] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                  
                  <AnimatePresence>
                    {expandedPatches[m.id] && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-2 space-y-2 overflow-hidden"
                      >
                        {m.patches.map((p, i) => (
                          <div key={i} className="text-[10px] font-mono rounded-lg border border-zinc-100 overflow-hidden">
                            <div className="bg-red-50 text-red-700 p-2 border-b border-red-100 line-through whitespace-pre-wrap">
                              {p.old}
                            </div>
                            <div className="bg-emerald-50 text-emerald-700 p-2 whitespace-pre-wrap">
                              {p.new}
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              
              {m.attachments && m.attachments.length > 0 && (
                <div className="mt-2 flex flex-col gap-2">
                  {m.attachments.map(a => (
                    <div key={a.id} className="flex flex-col gap-1">
                      {a.type === 'image' ? (
                        <div className="relative group max-w-sm">
                          <img 
                            src={`data:${a.mimeType};base64,${a.data}`} 
                            alt={a.name}
                            className="rounded-lg border border-zinc-200 max-h-64 object-contain bg-zinc-50"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 backdrop-blur text-[10px] text-white rounded opacity-0 group-hover:opacity-100 transition-opacity">
                            {a.name}
                          </div>
                        </div>
                      ) : (
                        <div className="text-[10px] bg-black/10 px-2 py-1 rounded flex items-center gap-1 self-start">
                          <FileText size={10} />
                          {a.name}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <span className="text-[10px] text-zinc-400 mt-1 px-1">
              {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
        
        {isStreaming && (
          <div className="flex items-center gap-2 text-zinc-400 text-xs animate-pulse">
            <Loader2 size={12} className="animate-spin" />
            AI is thinking...
          </div>
        )}
      </div>

      <div className="p-4 bg-white border-t border-zinc-200">
        <AnimatePresence>
          {attachments.length > 0 && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="flex flex-wrap gap-2 mb-3 overflow-hidden"
            >
              {attachments.map(a => (
                <div key={a.id} className="relative group">
                  <div className="flex items-center gap-2 bg-zinc-100 border border-zinc-200 rounded-lg px-3 py-1.5 text-xs text-zinc-600">
                    {a.type === 'image' ? <ImageIcon size={14} /> : <FileText size={14} />}
                    <span className="max-w-[100px] truncate">{a.name}</span>
                    <button 
                      onClick={() => removeAttachment(a.id)}
                      className="text-zinc-400 hover:text-red-500 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative flex items-end gap-2">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
          >
            <Paperclip size={20} />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            multiple 
            onChange={handleFileChange}
          />
          
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a message..."
            className="flex-1 bg-zinc-100 border-none rounded-2xl px-4 py-2 text-sm focus:ring-2 focus:ring-zinc-200 resize-none max-h-32 min-h-[40px]"
            rows={1}
          />
          
          <button 
            onClick={handleSend}
            disabled={(!input.trim() && attachments.length === 0) || isStreaming}
            className={cn(
              "p-2 rounded-xl transition-all",
              (!input.trim() && attachments.length === 0) || isStreaming
                ? "bg-zinc-100 text-zinc-300"
                : "bg-zinc-800 text-white hover:bg-zinc-900 shadow-md active:scale-95"
            )}
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

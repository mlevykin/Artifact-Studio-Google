import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Paperclip, 
  X, 
  Image as ImageIcon, 
  FileText, 
  Loader2, 
  Menu, 
  ChevronDown, 
  ChevronUp, 
  Diff, 
  Sparkles,
  Plus,
  Book,
  Server,
  CheckCircle2,
  Circle,
  Wand2
} from 'lucide-react';
import { Message, Attachment, Skill, MCPConfig } from '../types';
import { cn, generateId } from '../utils';
import { motion, AnimatePresence } from 'motion/react';
import { MermaidPreview } from './MermaidPreview';
import { 
  stripArtifactsAndPatches, 
  parseThought, 
  parseInvokedSkills, 
  parseMcpCalls 
} from '../engines/patchEngine';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatPanelProps {
  messages: Message[];
  onSendMessage: (content: string, attachments: Attachment[]) => void;
  isStreaming: boolean;
  streamingText: string;
  provider: 'gemini' | 'ollama';
  ollamaConfig: { baseUrl: string; selectedModel: string };
  availableModels: string[];
  onOllamaConfigChange: (config: { baseUrl?: string; selectedModel?: string }) => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  skills: Skill[];
  mcpConfigs: MCPConfig[];
  activeSkillIds: string[];
  onToggleSkill: (id: string) => void;
  activeMcpIds: string[];
  onToggleMcp: (id: string) => void;
  autoSelectSkills: boolean;
  onToggleAutoSelect: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ 
  messages, 
  onSendMessage, 
  isStreaming,
  streamingText,
  provider,
  ollamaConfig,
  availableModels,
  onOllamaConfigChange,
  isSidebarOpen,
  onToggleSidebar,
  skills,
  mcpConfigs,
  activeSkillIds,
  onToggleSkill,
  activeMcpIds,
  onToggleMcp,
  autoSelectSkills,
  onToggleAutoSelect
}) => {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const activeSkills = skills.filter(s => activeSkillIds.includes(s.id));
  const activeMcps = mcpConfigs.filter(m => activeMcpIds.includes(m.id));
  const [showOllamaSettings, setShowOllamaSettings] = useState(false);
  const [showSelection, setShowSelection] = useState(false);
  const [expandedPatches, setExpandedPatches] = useState<Record<string, boolean>>({});
  const [expandedThoughts, setExpandedThoughts] = useState<Record<string, boolean>>({});
  const [expandedSkills, setExpandedSkills] = useState<Record<string, boolean>>({});
  const [expandedMcpCalls, setExpandedMcpCalls] = useState<Record<string, boolean>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const togglePatch = (messageId: string) => {
    setExpandedPatches(prev => ({ ...prev, [messageId]: !prev[messageId] }));
  };

  const toggleThought = (messageId: string) => {
    setExpandedThoughts(prev => ({ ...prev, [messageId]: !prev[messageId] }));
  };

  const toggleInvokedSkills = (messageId: string) => {
    setExpandedSkills(prev => ({ ...prev, [messageId]: !prev[messageId] }));
  };

  const toggleMcpCalls = (messageId: string) => {
    setExpandedMcpCalls(prev => ({ ...prev, [messageId]: !prev[messageId] }));
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
    <div className="flex flex-col h-full bg-zinc-50 border-r border-zinc-200 w-full flex-shrink-0">
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
                "p-3 rounded-2xl text-sm shadow-sm",
                m.role === 'user' 
                  ? (m.content.startsWith('MCP CALL RESULT') 
                      ? "bg-zinc-100 border border-zinc-200 text-zinc-600 rounded-tr-none font-mono text-[10px]" 
                      : "bg-zinc-800 text-white rounded-tr-none shadow-md")
                  : "bg-white border border-zinc-200 text-zinc-800 rounded-tl-none"
              )}
            >
              {m.role === 'assistant' && (
                <div className="flex flex-col gap-3">
                  {m.thought && (
                    <div className="pb-3 border-b border-zinc-100">
                      <button 
                        onClick={() => toggleThought(m.id)}
                        className="flex items-center gap-2 text-[10px] font-bold text-indigo-500 hover:text-indigo-700 transition-colors"
                      >
                        <Sparkles size={12} />
                        THOUGHT PROCESS
                        {expandedThoughts[m.id] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                      
                      <AnimatePresence>
                        {expandedThoughts[m.id] && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="mt-2 text-[11px] text-zinc-500 italic bg-zinc-50 p-2 rounded-lg border border-zinc-100 overflow-hidden whitespace-pre-wrap"
                          >
                            {m.thought}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {(m.invokedSkills?.length || 0) + (m.mcpCalls?.length || 0) > 0 && (
                    <div className="flex flex-col gap-3 relative pl-4 before:absolute before:left-1 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-100">
                      {m.invokedSkills?.map((skill, i) => (
                        <div key={`skill-${i}`} className="relative">
                          <div className="absolute -left-[18px] top-2 w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-white" />
                          <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-2 shadow-sm">
                            <button 
                              onClick={() => toggleInvokedSkills(m.id)}
                              className="flex items-center gap-2 text-[10px] font-bold text-emerald-700"
                            >
                              <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[8px]">
                                {i + 1}
                              </div>
                              Добавляю в контекст skill: {skill.name}
                              {expandedSkills[m.id] ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                            </button>
                            <AnimatePresence>
                              {expandedSkills[m.id] && skill.description && (
                                <motion.div 
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="mt-1 text-[10px] text-zinc-500 italic pl-6 border-l border-emerald-200 overflow-hidden"
                                >
                                  {skill.description}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      ))}

                      {m.mcpCalls?.map((call, i) => {
                        const stepNum = (m.invokedSkills?.length || 0) + i + 1;
                        const isError = call.response?.error || (call.response?.isError);
                        
                        return (
                          <div key={`mcp-${i}`} className="relative">
                            <div className={cn(
                              "absolute -left-[18px] top-2 w-2 h-2 rounded-full ring-4 ring-white",
                              isError ? "bg-red-500" : "bg-amber-500"
                            )} />
                            <div className={cn(
                              "border rounded-xl p-2 shadow-sm transition-colors",
                              isError ? "bg-red-50/50 border-red-100" : "bg-amber-50/50 border-amber-100"
                            )}>
                              <button 
                                onClick={() => toggleMcpCalls(m.id)}
                                className={cn(
                                  "flex items-center gap-2 text-[10px] font-bold w-full text-left",
                                  isError ? "text-red-700" : "text-amber-700"
                                )}
                              >
                                <div className={cn(
                                  "w-4 h-4 rounded-full text-white flex items-center justify-center text-[8px] shrink-0",
                                  isError ? "bg-red-500" : "bg-amber-500"
                                )}>
                                  {stepNum}
                                </div>
                                <span className="truncate flex-1">MCP TOOL: {call.name}</span>
                                {isError && <span className="text-[8px] bg-red-100 text-red-600 px-1 rounded uppercase tracking-tighter">Error</span>}
                                {expandedMcpCalls[m.id] ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                              </button>
                              <AnimatePresence>
                                {expandedMcpCalls[m.id] && (
                                  <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="mt-2 space-y-2 overflow-hidden pl-6 border-l border-amber-200"
                                  >
                                    {call.description && (
                                      <div className="text-[10px] text-zinc-500 italic">{call.description}</div>
                                    )}
                                    <div className="space-y-1">
                                      <div className="text-[8px] uppercase tracking-widest text-zinc-400 flex items-center justify-between">
                                        Request
                                      </div>
                                      <pre className="p-1.5 bg-white text-[9px] font-mono text-zinc-600 overflow-x-auto rounded-lg border border-zinc-100 max-h-32">
                                        {JSON.stringify(call.request, null, 2)}
                                      </pre>
                                    </div>
                                    <div className="space-y-1">
                                      <div className="text-[8px] uppercase tracking-widest text-zinc-400 flex items-center justify-between">
                                        Response
                                        <button 
                                          onClick={() => navigator.clipboard.writeText(JSON.stringify(call.response, null, 2))}
                                          className="hover:text-amber-600 transition-colors"
                                          title="Copy Response"
                                        >
                                          Copy
                                        </button>
                                      </div>
                                      <pre className={cn(
                                        "p-1.5 text-[9px] font-mono overflow-x-auto rounded-lg border max-h-64",
                                        isError ? "bg-red-50 text-red-600 border-red-100" : "bg-white text-zinc-600 border-zinc-100"
                                      )}>
                                        {JSON.stringify(call.response, null, 2)}
                                      </pre>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className={cn(
                "prose prose-sm max-w-none break-words",
                m.role === 'user' ? "text-white prose-invert" : "text-zinc-800"
              )}>
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    table({ children }: any) {
                      return (
                        <div className="overflow-x-auto w-full mb-4 border border-zinc-200 rounded-lg">
                          <table className="min-w-full">{children}</table>
                        </div>
                      );
                    },
                    code({ node, inline, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || '');
                      const isMermaid = match && match[1] === 'mermaid';
                      
                      if (!inline && isMermaid) {
                        return (
                          <div className="my-4 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
                            <MermaidPreview 
                              content={String(children).replace(/\n$/, '')} 
                              className="!w-full !p-4 !shadow-none !rounded-none !min-h-0"
                            />
                          </div>
                        );
                      }
                      
                      return (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    }
                  }}
                >
                  {m.content}
                </ReactMarkdown>
              </div>
              
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
        
        {isStreaming && streamingText && (
          <div className="mr-auto items-start max-w-[85%] flex flex-col">
            <div className="p-3 rounded-2xl text-sm bg-white border border-zinc-200 text-zinc-800 rounded-tl-none shadow-sm w-full">
              <div className="flex flex-col gap-3">
                {parseThought(streamingText) && (
                  <div className="pb-3 border-b border-zinc-100">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-500">
                      <Sparkles size={12} />
                      THOUGHT PROCESS
                    </div>
                    <div className="mt-2 text-[11px] text-zinc-500 italic bg-zinc-50 p-2 rounded-lg border border-zinc-100 overflow-hidden whitespace-pre-wrap">
                      {parseThought(streamingText)}
                    </div>
                  </div>
                )}

                {(parseInvokedSkills(streamingText).length > 0 || parseMcpCalls(streamingText).length > 0) && (
                  <div className="flex flex-col gap-3 relative pl-4 before:absolute before:left-1 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-100">
                    {parseInvokedSkills(streamingText).map((skill, i) => (
                      <div key={`stream-skill-${i}`} className="relative">
                        <div className="absolute -left-[18px] top-2 w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-white" />
                        <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-2 shadow-sm">
                          <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-700">
                            <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[8px]">
                              {i + 1}
                            </div>
                            Добавляю в контекст skill: {skill.name}
                          </div>
                          {skill.description && (
                            <div className="mt-1 text-[10px] text-zinc-500 italic pl-6 border-l border-emerald-200">
                              {skill.description}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {parseMcpCalls(streamingText).map((call, i) => {
                      const stepNum = parseInvokedSkills(streamingText).length + i + 1;
                      return (
                        <div key={`stream-mcp-${i}`} className="relative">
                          <div className="absolute -left-[18px] top-2 w-2 h-2 rounded-full bg-amber-500 ring-4 ring-white" />
                          <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-2 shadow-sm">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-amber-700">
                              <div className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[8px]">
                                {stepNum}
                              </div>
                              MCP TOOL: {call.name}
                            </div>
                            {call.description && (
                              <div className="mt-1 text-[10px] text-zinc-500 italic pl-6 border-l border-amber-200">
                                {call.description}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="prose prose-sm max-w-none break-words text-zinc-800 mt-3">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    table({ children }: any) {
                      return (
                        <div className="overflow-x-auto w-full mb-4 border border-zinc-200 rounded-lg">
                          <table className="min-w-full">{children}</table>
                        </div>
                      );
                    },
                    code({ node, inline, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || '');
                      const isMermaid = match && match[1] === 'mermaid';
                      
                      if (!inline && isMermaid) {
                        return (
                          <div className="my-4 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
                            <MermaidPreview 
                              content={String(children).replace(/\n$/, '')} 
                              className="!w-full !p-4 !shadow-none !rounded-none !min-h-0"
                            />
                          </div>
                        );
                      }
                      
                      return (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    }
                  }}
                >
                  {stripArtifactsAndPatches(streamingText)}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )}

        {isStreaming && !streamingText && (
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
          <div className="flex flex-col gap-2 items-start">
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setShowSelection(!showSelection)}
                className={cn(
                  "p-2 rounded-lg transition-all",
                  showSelection ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100"
                )}
                title="Select Skills & MCP"
              >
                <Plus size={20} className={cn(showSelection && "rotate-45 transition-transform")} />
              </button>
              
              <div className="flex items-center gap-1 overflow-x-auto max-w-[150px] no-scrollbar py-0.5">
                {autoSelectSkills ? (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-100 text-[9px] font-bold whitespace-nowrap">
                    <Wand2 size={10} />
                    AUTO
                  </div>
                ) : (
                  <>
                    {activeSkills.map(skill => (
                      <div 
                        key={skill.id}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100 text-[9px] font-bold whitespace-nowrap"
                        title={skill.name}
                      >
                        <Book size={10} />
                        {skill.name.length > 8 ? skill.name.substring(0, 8) + '...' : skill.name}
                      </div>
                    ))}
                    {activeMcps.map(mcp => (
                      <div 
                        key={mcp.id}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-600 border border-amber-100 text-[9px] font-bold whitespace-nowrap"
                        title={mcp.name}
                      >
                        <Server size={10} />
                        {mcp.name.length > 8 ? mcp.name.substring(0, 8) + '...' : mcp.name}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
            >
              <Paperclip size={20} />
            </button>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            multiple 
            onChange={handleFileChange}
          />

          <AnimatePresence>
            {showSelection && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute bottom-full left-0 mb-4 w-72 bg-white border border-zinc-200 rounded-2xl shadow-2xl overflow-hidden z-50"
              >
                <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Context Selection</h3>
                  <button 
                    onClick={onToggleAutoSelect}
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold transition-all",
                      autoSelectSkills 
                        ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
                        : "bg-zinc-100 text-zinc-400 hover:text-zinc-600"
                    )}
                  >
                    <Wand2 size={12} />
                    AUTO
                  </button>
                </div>

                <div className="max-h-80 overflow-y-auto p-2 space-y-4">
                  <div className="space-y-1">
                    <div className="px-2 py-1 text-[9px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Book size={10} />
                      Skills
                    </div>
                    {skills.length === 0 ? (
                      <div className="px-2 py-3 text-[10px] text-zinc-400 italic">No skills available</div>
                    ) : (
                      skills.map(skill => (
                        <button 
                          key={skill.id}
                          onClick={() => onToggleSkill(skill.id)}
                          disabled={autoSelectSkills}
                          className={cn(
                            "w-full flex items-center gap-3 p-2 rounded-xl transition-all text-left group",
                            activeSkillIds.includes(skill.id) ? "bg-emerald-50" : "hover:bg-zinc-50",
                            autoSelectSkills && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          {activeSkillIds.includes(skill.id) ? (
                            <CheckCircle2 size={16} className="text-emerald-500" />
                          ) : (
                            <Circle size={16} className="text-zinc-300 group-hover:text-zinc-400" />
                          )}
                          <div className="min-w-0">
                            <div className={cn("text-xs font-medium truncate", activeSkillIds.includes(skill.id) ? "text-emerald-700" : "text-zinc-700")}>
                              {skill.name}
                            </div>
                            <div className="text-[9px] text-zinc-400 truncate">{skill.description}</div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="px-2 py-1 text-[9px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Server size={10} />
                      MCP Servers
                    </div>
                    {mcpConfigs.length === 0 ? (
                      <div className="px-2 py-3 text-[10px] text-zinc-400 italic">No MCP servers configured</div>
                    ) : (
                      mcpConfigs.map(mcp => (
                        <button 
                          key={mcp.id}
                          onClick={() => onToggleMcp(mcp.id)}
                          disabled={autoSelectSkills}
                          className={cn(
                            "w-full flex items-center gap-3 p-2 rounded-xl transition-all text-left group",
                            activeMcpIds.includes(mcp.id) ? "bg-amber-50" : "hover:bg-zinc-50",
                            autoSelectSkills && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          {activeMcpIds.includes(mcp.id) ? (
                            <CheckCircle2 size={16} className="text-amber-500" />
                          ) : (
                            <Circle size={16} className="text-zinc-300 group-hover:text-zinc-400" />
                          )}
                          <div className="min-w-0">
                            <div className={cn("text-xs font-medium truncate", activeMcpIds.includes(mcp.id) ? "text-amber-700" : "text-zinc-700")}>
                              {mcp.name}
                            </div>
                            <div className="text-[9px] text-zinc-400 truncate">{mcp.url}</div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
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

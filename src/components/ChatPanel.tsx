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
  Wand2,
  Layers,
  Square,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  RotateCcw
} from 'lucide-react';
import { Message, Attachment, Skill, MCPConfig, ContextSettings } from '../types';
import { cn, generateId } from '../utils';
import { motion, AnimatePresence } from 'motion/react';
import { MermaidPreview } from './MermaidPreview';
import { 
  stripArtifactsAndPatches, 
  parseThought, 
  parseInvokedSkills, 
  parseMcpCalls,
  parseMessageSteps
} from '../engines/responseParser';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatPanelProps {
  messages: Message[];
  onSendMessage: (content: string, attachments: Attachment[]) => void;
  isStreaming: boolean;
  streamingText: string;
  autoSelectSkills: boolean;
  onToggleAutoSelect: () => void;
  provider: 'gemini' | 'ollama';
  onProviderChange: (provider: 'gemini' | 'ollama') => void;
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
  geminiApiKey: string;
  onGeminiApiKeyChange: (key: string) => void;
  geminiModel: string;
  onGeminiModelChange: (model: string) => void;
  webSearchEnabled: boolean;
  onToggleWebSearch: () => void;
  contextSettings: ContextSettings;
  onContextSettingsChange: (settings: ContextSettings) => void;
  onStop?: () => void;
  onApplyVerificationFixes: (messageId: string) => void;
  testerSkillIds: string[];
  onToggleTester: (id: string) => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ 
  messages, 
  onSendMessage, 
  onStop,
  isStreaming,
  streamingText,
  provider,
  onProviderChange,
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
  onToggleAutoSelect,
  geminiApiKey,
  onGeminiApiKeyChange,
  geminiModel,
  onGeminiModelChange,
  webSearchEnabled,
  onToggleWebSearch,
  contextSettings,
  onContextSettingsChange,
  onApplyVerificationFixes,
  testerSkillIds,
  onToggleTester
}) => {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const activeSkills = skills.filter(s => activeSkillIds.includes(s.id));
  const activeMcps = mcpConfigs.filter(m => activeMcpIds.includes(m.id));
  const [showOllamaSettings, setShowOllamaSettings] = useState(false);
  const [showGeminiSettings, setShowGeminiSettings] = useState(false);
  const [showSkills, setShowSkills] = useState(false);
  const [showMcp, setShowMcp] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [expandedPatches, setExpandedPatches] = useState<Record<string, boolean>>({});
  const [expandedThoughts, setExpandedThoughts] = useState<Record<string, boolean>>({});
  const [expandedSkills, setExpandedSkills] = useState<Record<string, boolean>>({});
  const [expandedMcpCalls, setExpandedMcpCalls] = useState<Record<string, boolean>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

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

  const toggleContextSetting = (key: keyof ContextSettings) => {
    onContextSettingsChange({
      ...contextSettings,
      [key]: !contextSettings[key]
    });
  };

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

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (!file) continue;

        if (file.size > 10 * 1024 * 1024) {
          alert(`Pasted image is too large (>10MB)`);
          continue;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          const data = event.target?.result as string;
          const newAttachment: Attachment = {
            id: generateId(),
            type: 'image',
            name: `pasted-image-${Date.now()}.png`,
            data: data.split(',')[1],
            mimeType: file.type
          };
          setAttachments(prev => [...prev, newAttachment]);
        };
        reader.readAsDataURL(file);
      }
    }
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
            {provider === 'gemini' && (
              <button 
                onClick={() => setShowGeminiSettings(!showGeminiSettings)}
                className="p-1 hover:bg-zinc-100 rounded text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                <Loader2 size={14} className={cn(showGeminiSettings && "rotate-45")} />
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

        {showGeminiSettings && provider === 'gemini' && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="overflow-hidden space-y-2 pt-2 border-t border-zinc-100"
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-[9px] font-bold text-zinc-400 uppercase">Gemini API Key</label>
                <span className="text-[8px] text-zinc-400 italic">Leave empty for system key</span>
              </div>
              <input 
                type="password"
                value={geminiApiKey}
                onChange={(e) => onGeminiApiKeyChange(e.target.value)}
                className="text-[10px] bg-zinc-100 border-none rounded-lg px-2 py-1 focus:ring-1 focus:ring-zinc-200 outline-none"
                placeholder="Enter API Key..."
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-zinc-400 uppercase">Gemini Model</label>
              <select 
                value={geminiModel}
                onChange={(e) => onGeminiModelChange(e.target.value)}
                className="text-[10px] bg-zinc-100 border-none rounded-lg px-2 py-1 focus:ring-1 focus:ring-zinc-200 outline-none"
              >
                <option value="gemini-3-flash-preview">Gemini 3 Flash (Default)</option>
                <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Powerful)</option>
                <option value="gemini-3.1-flash-lite-preview">Gemini 3.1 Flash Lite</option>
                <option value="gemini-flash-latest">Gemini Flash Latest (Stable)</option>
              </select>
            </div>
            <div className="flex items-center justify-between pt-1">
              <label className="text-[9px] font-bold text-zinc-400 uppercase">Web Search</label>
              <button 
                onClick={onToggleWebSearch}
                className={cn(
                  "w-8 h-4 rounded-full transition-colors relative",
                  webSearchEnabled ? "bg-indigo-500" : "bg-zinc-300"
                )}
              >
                <div className={cn(
                  "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all",
                  webSearchEnabled ? "left-4.5" : "left-0.5"
                )} />
              </button>
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
        
        {messages.filter(m => !m.isSystemGenerated).map((m) => (
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
              {m.role === 'assistant' && m.steps ? (
                <div className="flex flex-col gap-3">
                  {m.steps.map((step, stepIdx) => {
                    if (step.type === 'thought') {
                      return (
                        <div key={`step-${stepIdx}`} className="pb-3 border-b border-zinc-100 last:border-0">
                          <button 
                            onClick={() => toggleThought(`${m.id}-${stepIdx}`)}
                            className="flex items-center gap-2 text-[10px] font-bold text-indigo-500 hover:text-indigo-700 transition-colors"
                          >
                            <Sparkles size={12} />
                            THOUGHT PROCESS
                            {expandedThoughts[`${m.id}-${stepIdx}`] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </button>
                          
                          <AnimatePresence>
                            {expandedThoughts[`${m.id}-${stepIdx}`] && (
                              <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="mt-2 text-[11px] text-zinc-500 italic bg-zinc-50 p-2 rounded-lg border border-zinc-100 overflow-hidden whitespace-pre-wrap"
                              >
                                {step.content}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    }

                    if (step.type === 'skill') {
                      return (
                        <div key={`step-${stepIdx}`} className="relative pl-4 before:absolute before:left-1 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-100">
                          <div className="absolute -left-[18px] top-2 w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-white" />
                          <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-2 shadow-sm">
                            <button 
                              onClick={() => toggleInvokedSkills(`${m.id}-${stepIdx}`)}
                              className="flex items-center gap-2 text-[10px] font-bold text-emerald-700"
                            >
                              <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[8px]">
                                {stepIdx + 1}
                              </div>
                              Adding skill to context: {step.name}
                              {expandedSkills[`${m.id}-${stepIdx}`] ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                            </button>
                            <AnimatePresence>
                              {expandedSkills[`${m.id}-${stepIdx}`] && step.description && (
                                <motion.div 
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="mt-1 text-[10px] text-zinc-500 italic pl-6 border-l border-emerald-200 overflow-hidden"
                                >
                                  {step.description}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      );
                    }

                    if (step.type === 'mcp') {
                      const isError = step.response?.error || (step.response?.isError);
                      return (
                        <div key={`step-${stepIdx}`} className="relative pl-4 before:absolute before:left-1 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-100">
                          <div className={cn(
                            "absolute -left-[18px] top-2 w-2 h-2 rounded-full ring-4 ring-white",
                            isError ? "bg-red-500" : "bg-amber-500"
                          )} />
                          <div className={cn(
                            "border rounded-xl p-2 shadow-sm transition-colors",
                            isError ? "bg-red-50/50 border-red-100" : "bg-amber-50/50 border-amber-100"
                          )}>
                            <button 
                              onClick={() => toggleMcpCalls(`${m.id}-${stepIdx}`)}
                              className={cn(
                                "flex items-center gap-2 text-[10px] font-bold w-full text-left",
                                isError ? "text-red-700" : "text-amber-700"
                              )}
                            >
                              <div className={cn(
                                "w-4 h-4 rounded-full text-white flex items-center justify-center text-[8px] shrink-0",
                                isError ? "bg-red-500" : "bg-amber-500"
                              )}>
                                {stepIdx + 1}
                              </div>
                              <span className="truncate flex-1">MCP TOOL: {step.name}</span>
                              {isError && <span className="text-[8px] bg-red-100 text-red-600 px-1 rounded uppercase tracking-tighter">Error</span>}
                              {expandedMcpCalls[`${m.id}-${stepIdx}`] ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                            </button>
                            <AnimatePresence>
                              {expandedMcpCalls[`${m.id}-${stepIdx}`] && (
                                <motion.div 
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="mt-2 space-y-2 overflow-hidden pl-6 border-l border-amber-200"
                                >
                                  {step.description && (
                                    <div className="text-[10px] text-zinc-500 italic">{step.description}</div>
                                  )}
                                  <div className="space-y-1">
                                    <div className="text-[8px] uppercase tracking-widest text-zinc-400 flex items-center justify-between">
                                      Request
                                    </div>
                                    <pre className="p-1.5 bg-white text-[9px] font-mono text-zinc-600 overflow-x-auto rounded-lg border border-zinc-100 max-h-32">
                                      {JSON.stringify(step.request, null, 2)}
                                    </pre>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="text-[8px] uppercase tracking-widest text-zinc-400 flex items-center justify-between">
                                      Response
                                      <button 
                                        onClick={() => navigator.clipboard.writeText(JSON.stringify(step.response, null, 2))}
                                        className="hover:text-amber-600 transition-colors"
                                        title="Copy Response"
                                      >
                                        Copy
                                      </button>
                                    </div>
                                    <pre className={cn(
                                      "p-1.5 text-[9px] font-mono whitespace-pre-wrap break-words rounded-lg border max-h-64",
                                      isError ? "bg-red-50 text-red-600 border-red-100" : "bg-white text-zinc-600 border-zinc-100"
                                    )}>
                                      {JSON.stringify(step.response, null, 2)}
                                    </pre>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      );
                    }

                    if (step.type === 'text') {
                      return (
                        <div key={`step-${stepIdx}`} className="prose prose-sm max-w-none break-words text-zinc-800">
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
                                        className="w-fit max-w-full mx-auto !p-4 !shadow-none !rounded-none !min-h-0"
                                      />
                                    </div>
                                  );
                                }
                                
                                return (
                                  <code className={cn(className, "whitespace-pre-wrap break-words")} {...props}>
                                    {children}
                                  </code>
                                );
                              }
                            }}
                          >
                            {step.content}
                          </ReactMarkdown>
                        </div>
                      );
                    }

                    return null;
                  })}
                </div>
              ) : (
                <>
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
                                  Adding skill to context: {skill.name}
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
                                  className="w-fit max-w-full mx-auto !p-4 !shadow-none !rounded-none !min-h-0"
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

                  {m.verificationReport && (
                    <div className={cn(
                      "mt-3 p-3 rounded-xl border flex flex-col gap-2",
                      m.verificationReport.isValid 
                        ? "bg-emerald-50 border-emerald-100 text-emerald-800" 
                        : "bg-amber-50 border-amber-100 text-amber-800"
                    )}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-[11px]">
                          {m.verificationReport.isValid ? (
                            <ShieldCheck size={14} className="text-emerald-600" />
                          ) : (
                            <AlertTriangle size={14} className="text-amber-600" />
                          )}
                          VERIFICATION BY {m.verificationReport.testerName.toUpperCase()}
                        </div>
                        {m.verificationReport.isValid ? (
                          <span className="text-[9px] bg-emerald-200 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold uppercase">Valid</span>
                        ) : (
                          <span className="text-[9px] bg-amber-200 text-amber-700 px-1.5 py-0.5 rounded-full font-bold uppercase">Issues Found</span>
                        )}
                      </div>

                      {!m.verificationReport.isValid && m.verificationReport.issues.length > 0 && (
                        <ul className="text-[11px] list-disc list-inside space-y-1 mt-1 opacity-90">
                          {m.verificationReport.issues.map((issue, i) => (
                            <li key={i}>{issue}</li>
                          ))}
                        </ul>
                      )}

                      {!m.verificationReport.isValid && m.verificationReport.suggestedPatches.length > 0 && (
                        <div className="mt-2 flex flex-col gap-2">
                          <div className="text-[9px] font-bold uppercase opacity-60">Suggested Patches</div>
                          <div className="max-h-32 overflow-y-auto space-y-2 pr-1">
                            {m.verificationReport.suggestedPatches.map((p, i) => (
                              <div key={i} className="text-[9px] font-mono rounded-lg border border-amber-200/50 overflow-hidden bg-white/50">
                                <div className="p-1.5 border-b border-amber-100/50 line-through opacity-50 whitespace-pre-wrap">{p.old}</div>
                                <div className="p-1.5 text-emerald-700 whitespace-pre-wrap">{p.new}</div>
                              </div>
                            ))}
                          </div>
                          
                          {m.verificationReport.status === 'pending' ? (
                            <button 
                              onClick={() => onApplyVerificationFixes(m.id)}
                              className="mt-1 flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white py-1.5 rounded-lg text-[11px] font-bold transition-colors shadow-sm"
                            >
                              <Wand2 size={12} />
                              Apply {m.verificationReport.suggestedPatches.length} Fixes
                            </button>
                          ) : (
                            <div className="mt-1 flex items-center justify-center gap-2 bg-emerald-100 text-emerald-700 py-1.5 rounded-lg text-[11px] font-bold border border-emerald-200">
                              <CheckCircle size={12} />
                              Fixes Applied
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
              
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
          <div className="mr-auto items-start max-w-[85%] flex flex-col">
            <div className="p-3 rounded-2xl text-sm bg-white border border-zinc-200 text-zinc-800 rounded-tl-none shadow-sm w-full min-h-[40px] flex items-center">
              {!streamingText ? (
                <div className="flex items-center gap-2 text-zinc-400 italic text-[11px]">
                  <Loader2 size={14} className="animate-spin" />
                  AI Thinking...
                </div>
              ) : (
                <div className="flex flex-col gap-3 w-full">
                  {parseMessageSteps(streamingText).map((step, stepIdx) => {
                    if (step.type === 'thought') {
                      return (
                        <div key={`stream-step-${stepIdx}`} className="pb-3 border-b border-zinc-100 last:border-0">
                          <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-500">
                            <Sparkles size={12} />
                            THOUGHT PROCESS
                          </div>
                          <div className="mt-2 text-[11px] text-zinc-500 italic bg-zinc-50 p-2 rounded-lg border border-zinc-100 overflow-hidden whitespace-pre-wrap">
                            {step.content}
                          </div>
                        </div>
                      );
                    }

                    if (step.type === 'skill') {
                      return (
                        <div key={`stream-step-${stepIdx}`} className="relative pl-4 before:absolute before:left-1 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-100">
                          <div className="absolute -left-[18px] top-2 w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-white" />
                          <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-2 shadow-sm">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-700">
                              <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[8px]">
                                {stepIdx + 1}
                              </div>
                              Adding skill to context: {step.name}
                            </div>
                            {step.description && (
                              <div className="mt-1 text-[10px] text-zinc-500 italic pl-6 border-l border-emerald-200">
                                {step.description}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }

                    if (step.type === 'mcp') {
                      return (
                        <div key={`stream-step-${stepIdx}`} className="relative pl-4 before:absolute before:left-1 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-100">
                          <div className="absolute -left-[18px] top-2 w-2 h-2 rounded-full bg-amber-500 ring-4 ring-white" />
                          <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-2 shadow-sm">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-amber-700">
                              <div className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[8px]">
                                {stepIdx + 1}
                              </div>
                              MCP TOOL: {step.name}
                            </div>
                            {step.description && (
                              <div className="mt-1 text-[10px] text-zinc-500 italic pl-6 border-l border-amber-200">
                                {step.description}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }

                    if (step.type === 'text') {
                      return (
                        <div key={`stream-step-${stepIdx}`} className="prose prose-sm max-w-none break-words text-zinc-800">
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
                                        className="w-fit max-w-full mx-auto !p-4 !shadow-none !rounded-none !min-h-0"
                                      />
                                    </div>
                                  );
                                }
                                
                                return (
                                  <code className={cn(className, "whitespace-pre-wrap break-words")} {...props}>
                                    {children}
                                  </code>
                                );
                              }
                            }}
                          >
                            {step.content}
                          </ReactMarkdown>
                        </div>
                      );
                    }

                    return null;
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-white border-t border-zinc-100">
        <div className="flex flex-col gap-3">
          {/* Context Indicators Row */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <button 
                onClick={() => {
                  setShowSkills(!showSkills);
                  setShowMcp(false);
                  setShowContext(false);
                }}
                className={cn(
                  "p-2 rounded-lg transition-all",
                  showSkills ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100"
                )}
                title="Select Skills"
              >
                <Book size={20} />
              </button>
              
              <AnimatePresence>
                {showSkills && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-full left-0 mb-4 w-64 bg-white border border-zinc-200 rounded-2xl shadow-2xl overflow-hidden z-50"
                  >
                    <div className="p-3 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
                      <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Skills</h3>
                      <button 
                        onClick={onToggleAutoSelect}
                        className={cn(
                          "flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-bold transition-all",
                          autoSelectSkills 
                            ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
                            : "bg-zinc-100 text-zinc-400 hover:text-zinc-600"
                        )}
                      >
                        <Wand2 size={10} />
                        AUTO
                      </button>
                    </div>
                    <div className="max-h-64 overflow-y-auto p-1.5">
                      {skills.length === 0 ? (
                        <div className="px-2 py-3 text-[10px] text-zinc-400 italic">No skills available</div>
                      ) : (
                        skills.map(skill => (
                          <button 
                            key={skill.id}
                            onClick={() => onToggleSkill(skill.id)}
                            disabled={autoSelectSkills}
                            className={cn(
                              "w-full flex items-center gap-2.5 p-2 rounded-xl transition-all text-left group",
                              activeSkillIds.includes(skill.id) 
                                ? (testerSkillIds.includes(skill.id) ? "bg-blue-50" : "bg-emerald-50") 
                                : "hover:bg-zinc-50",
                              autoSelectSkills && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            {activeSkillIds.includes(skill.id) ? (
                              testerSkillIds.includes(skill.id) 
                                ? <CheckCircle2 size={14} className="text-blue-500" />
                                : <CheckCircle2 size={14} className="text-emerald-500" />
                            ) : (
                              <Circle size={14} className="text-zinc-300 group-hover:text-zinc-400" />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <div className={cn(
                                  "text-[11px] font-medium truncate", 
                                  activeSkillIds.includes(skill.id) 
                                    ? (testerSkillIds.includes(skill.id) ? "text-blue-700" : "text-emerald-700") 
                                    : "text-zinc-700"
                                )}>
                                  {skill.name}
                                </div>
                                {testerSkillIds.includes(skill.id) && (
                                  <ShieldCheck size={10} className="text-blue-500" />
                                )}
                              </div>
                              <div className="text-[9px] text-zinc-400 truncate">{skill.description}</div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="relative">
              <button 
                onClick={() => {
                  setShowMcp(!showMcp);
                  setShowSkills(false);
                  setShowContext(false);
                }}
                className={cn(
                  "p-2 rounded-lg transition-all",
                  showMcp ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" : "text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100"
                )}
                title="Select MCP Servers"
              >
                <Server size={20} />
              </button>

              <AnimatePresence>
                {showMcp && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-full left-0 mb-4 w-64 bg-white border border-zinc-200 rounded-2xl shadow-2xl overflow-hidden z-50"
                  >
                    <div className="p-3 border-b border-zinc-100 bg-zinc-50/50">
                      <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">MCP Servers</h3>
                    </div>
                    <div className="max-h-64 overflow-y-auto p-1.5">
                      {mcpConfigs.filter(m => m.enabled).length === 0 ? (
                        <div className="px-2 py-3 text-[10px] text-zinc-400 italic">No enabled MCP servers</div>
                      ) : (
                        mcpConfigs.filter(m => m.enabled).map(mcp => (
                          <button 
                            key={mcp.id}
                            onClick={() => onToggleMcp(mcp.id)}
                            disabled={autoSelectSkills}
                            className={cn(
                              "w-full flex items-center gap-2.5 p-2 rounded-xl transition-all text-left group",
                              activeMcpIds.includes(mcp.id) ? "bg-amber-50" : "hover:bg-zinc-50",
                              autoSelectSkills && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            {activeMcpIds.includes(mcp.id) ? (
                              <CheckCircle2 size={14} className="text-amber-500" />
                            ) : (
                              <Circle size={14} className="text-zinc-300 group-hover:text-zinc-400" />
                            )}
                            <div className="min-w-0">
                              <div className={cn("text-[11px] font-medium truncate", activeMcpIds.includes(mcp.id) ? "text-amber-700" : "text-zinc-700")}>
                                {mcp.name}
                              </div>
                              <div className="text-[9px] text-zinc-400 truncate">{mcp.url}</div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="relative">
              <button 
                onClick={() => {
                  setShowContext(!showContext);
                  setShowSkills(false);
                  setShowMcp(false);
                }}
                className={cn(
                  "p-2 rounded-lg transition-all",
                  showContext ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100"
                )}
                title="Context Management"
              >
                <Layers size={20} />
              </button>

              <AnimatePresence>
                {showContext && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-full left-0 mb-4 w-64 bg-white border border-zinc-200 rounded-2xl shadow-2xl overflow-hidden z-50"
                  >
                    <div className="p-3 border-b border-zinc-100 bg-zinc-50/50">
                      <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Context Management</h3>
                    </div>
                    <div className="p-1.5 space-y-1">
                      <button 
                        onClick={() => toggleContextSetting('includeSystemPrompt')}
                        className={cn(
                          "w-full flex items-center gap-2.5 p-2 rounded-xl transition-all text-left group",
                          contextSettings.includeSystemPrompt ? "bg-indigo-50" : "hover:bg-zinc-50"
                        )}
                      >
                        {contextSettings.includeSystemPrompt ? (
                          <CheckCircle2 size={14} className="text-indigo-500" />
                        ) : (
                          <Circle size={14} className="text-zinc-300 group-hover:text-zinc-400" />
                        )}
                        <span className={cn("text-[11px] font-medium", contextSettings.includeSystemPrompt ? "text-indigo-700" : "text-zinc-700")}>
                          System Prompt
                        </span>
                      </button>
                      <button 
                        onClick={() => toggleContextSetting('includeChatHistory')}
                        className={cn(
                          "w-full flex items-center gap-2.5 p-2 rounded-xl transition-all text-left group",
                          contextSettings.includeChatHistory ? "bg-indigo-50" : "hover:bg-zinc-50"
                        )}
                      >
                        {contextSettings.includeChatHistory ? (
                          <CheckCircle2 size={14} className="text-indigo-500" />
                        ) : (
                          <Circle size={14} className="text-zinc-300 group-hover:text-zinc-400" />
                        )}
                        <span className={cn("text-[11px] font-medium", contextSettings.includeChatHistory ? "text-indigo-700" : "text-zinc-700")}>
                          Chat History
                        </span>
                      </button>
                      <button 
                        onClick={() => toggleContextSetting('includeAttachmentsHistory')}
                        className={cn(
                          "w-full flex items-center gap-2.5 p-2 rounded-xl transition-all text-left group",
                          contextSettings.includeAttachmentsHistory ? "bg-indigo-50" : "hover:bg-zinc-50"
                        )}
                      >
                        {contextSettings.includeAttachmentsHistory ? (
                          <CheckCircle2 size={14} className="text-indigo-500" />
                        ) : (
                          <Circle size={14} className="text-zinc-300 group-hover:text-zinc-400" />
                        )}
                        <span className={cn("text-[11px] font-medium", contextSettings.includeAttachmentsHistory ? "text-indigo-700" : "text-zinc-700")}>
                          Attachments History
                        </span>
                      </button>
                      <button 
                        onClick={() => toggleContextSetting('includeArtifactContext')}
                        className={cn(
                          "w-full flex items-center gap-2.5 p-2 rounded-xl transition-all text-left group",
                          contextSettings.includeArtifactContext ? "bg-indigo-50" : "hover:bg-zinc-50"
                        )}
                      >
                        {contextSettings.includeArtifactContext ? (
                          <CheckCircle2 size={14} className="text-indigo-500" />
                        ) : (
                          <Circle size={14} className="text-zinc-300 group-hover:text-zinc-400" />
                        )}
                        <span className={cn("text-[11px] font-medium", contextSettings.includeArtifactContext ? "text-indigo-700" : "text-zinc-700")}>
                          Active Artifact Context
                        </span>
                      </button>
                      <button 
                        onClick={() => toggleContextSetting('includeSkills')}
                        className={cn(
                          "w-full flex items-center gap-2.5 p-2 rounded-xl transition-all text-left group",
                          contextSettings.includeSkills ? "bg-indigo-50" : "hover:bg-zinc-50"
                        )}
                      >
                        {contextSettings.includeSkills ? (
                          <CheckCircle2 size={14} className="text-indigo-500" />
                        ) : (
                          <Circle size={14} className="text-zinc-300 group-hover:text-zinc-400" />
                        )}
                        <span className={cn("text-[11px] font-medium", contextSettings.includeSkills ? "text-indigo-700" : "text-zinc-700")}>
                          Skills Context
                        </span>
                      </button>
                      <button 
                        onClick={() => toggleContextSetting('includeMcp')}
                        className={cn(
                          "w-full flex items-center gap-2.5 p-2 rounded-xl transition-all text-left group",
                          contextSettings.includeMcp ? "bg-indigo-50" : "hover:bg-zinc-50"
                        )}
                      >
                        {contextSettings.includeMcp ? (
                          <CheckCircle2 size={14} className="text-indigo-500" />
                        ) : (
                          <Circle size={14} className="text-zinc-300 group-hover:text-zinc-400" />
                        )}
                        <span className={cn("text-[11px] font-medium", contextSettings.includeMcp ? "text-indigo-700" : "text-zinc-700")}>
                          MCP Servers Context
                        </span>
                      </button>
                      <button 
                        onClick={() => toggleContextSetting('includeCurrentFile')}
                        className={cn(
                          "w-full flex items-center gap-2.5 p-2 rounded-xl transition-all text-left group",
                          contextSettings.includeCurrentFile ? "bg-indigo-50" : "hover:bg-zinc-50"
                        )}
                      >
                        {contextSettings.includeCurrentFile ? (
                          <CheckCircle2 size={14} className="text-indigo-500" />
                        ) : (
                          <Circle size={14} className="text-zinc-300 group-hover:text-zinc-400" />
                        )}
                        <span className={cn("text-[11px] font-medium", contextSettings.includeCurrentFile ? "text-indigo-700" : "text-zinc-700")}>
                          Selected File Path
                        </span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="flex items-center gap-1 overflow-x-auto flex-1 no-scrollbar py-0.5">
              {webSearchEnabled && provider === 'gemini' && (
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-600 border border-blue-100 text-[9px] font-bold whitespace-nowrap">
                  <Loader2 size={10} className="animate-spin" />
                  WEB SEARCH
                </div>
              )}
              {autoSelectSkills ? (
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-100 text-[9px] font-bold whitespace-nowrap">
                  <Wand2 size={10} />
                  AUTO
                </div>
              ) : (
                <>
                  {activeSkills.map(skill => {
                    const isTester = testerSkillIds.includes(skill.id);
                    return (
                      <div 
                        key={skill.id}
                        className={cn(
                          "flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold whitespace-nowrap border transition-all shadow-sm",
                          isTester 
                            ? "bg-blue-500 text-white border-blue-600" 
                            : "bg-emerald-50 text-emerald-600 border-emerald-100"
                        )}
                        title={skill.name + (isTester ? ' (Tester)' : '')}
                      >
                        {isTester ? <ShieldCheck size={10} /> : <Book size={10} />}
                        {skill.name.length > 12 ? skill.name.substring(0, 12) + '...' : skill.name}
                      </div>
                    );
                  })}
                  {testerSkillIds.filter(id => !activeSkillIds.includes(id)).map(id => {
                    const skill = skills.find(s => s.id === id);
                    if (!skill) return null;
                    return (
                      <div 
                        key={id}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-500 text-white border border-blue-600 text-[9px] font-bold whitespace-nowrap shadow-sm transition-all"
                        title={skill.name + ' (Tester Only)'}
                      >
                        <ShieldCheck size={10} />
                        {skill.name.length > 12 ? skill.name.substring(0, 12) + '...' : skill.name}
                      </div>
                    );
                  })}
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

          {/* Input Row */}
          <div className="flex items-end gap-2">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors flex-shrink-0"
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

            <div className="flex-1 relative flex flex-col">
              <AnimatePresence>
                {attachments.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="flex flex-wrap gap-2 mb-2"
                  >
                    {attachments.map((a) => (
                      <div key={a.id} className="relative group">
                        {a.type === 'image' ? (
                          <img src={`data:${a.mimeType};base64,${a.data}`} alt={a.name} className="w-12 h-12 rounded-lg object-cover border border-zinc-200" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-500">
                            <FileText size={20} />
                          </div>
                        )}
                        <button 
                          onClick={() => setAttachments(attachments.filter(att => att.id !== a.id))}
                          className="absolute -top-1 -right-1 bg-zinc-800 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
              
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onPaste={handlePaste}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (isStreaming) {
                      onStop?.();
                    } else {
                      handleSend();
                    }
                  }
                }}
                placeholder="Type a message..."
                className="w-full bg-zinc-100 border-none rounded-2xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-zinc-200 resize-none max-h-64 min-h-[40px] overflow-y-auto"
                rows={1}
              />
            </div>
            
            <button 
              onClick={isStreaming ? onStop : handleSend}
              disabled={!isStreaming && !input.trim() && attachments.length === 0}
              className={cn(
                "p-2.5 rounded-xl transition-all flex-shrink-0",
                !isStreaming && !input.trim() && attachments.length === 0
                  ? "bg-zinc-100 text-zinc-300"
                  : "bg-zinc-800 text-white hover:bg-zinc-900 shadow-md active:scale-95"
              )}
            >
              {isStreaming ? (
                <div className="w-5 h-5 flex items-center justify-center border-2 border-white rounded-full">
                  <div className="w-2 h-2 bg-white rounded-sm" />
                </div>
              ) : (
                <Send size={20} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

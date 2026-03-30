import React, { useState } from 'react';
import { ContextLogEntry } from '../types';
import { ChevronDown, ChevronRight, Clock, Cpu, Hash, Maximize2, Minimize2, MessageSquare, Terminal, Plus, Minus } from 'lucide-react';
import { cn } from '../utils';
import { motion, AnimatePresence } from 'motion/react';

interface ContextLogProps {
  logs: ContextLogEntry[];
}

export const ContextLog: React.FC<ContextLogProps> = ({ logs }) => {
  const [expandedEntries, setExpandedEntries] = useState<Record<string, boolean>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const toggleEntry = (id: string) => {
    setExpandedEntries(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSection = (id: string, section: string) => {
    const key = `${id}-${section}`;
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const expandAll = () => {
    const newExpanded: Record<string, boolean> = {};
    const newSections: Record<string, boolean> = {};
    logs.forEach(log => {
      newExpanded[log.id] = true;
      newSections[`${log.id}-request`] = true;
      newSections[`${log.id}-response`] = true;
    });
    setExpandedEntries(newExpanded);
    setExpandedSections(newSections);
  };

  const collapseAll = () => {
    setExpandedEntries({});
    setExpandedSections({});
  };

  if (logs.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 p-12 text-center">
        <Terminal size={48} className="mb-4 opacity-20" />
        <h3 className="text-lg font-medium text-zinc-600 mb-2">No Context Logs</h3>
        <p className="max-w-md text-sm">
          LLM interaction logs will appear here after you send a message.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-50 overflow-hidden">
      <div className="p-2 border-b border-zinc-200 bg-white flex items-center justify-between">
        <div className="flex items-center gap-2 px-2">
          <Terminal size={14} className="text-zinc-500" />
          <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Interaction History</span>
          <span className="text-[10px] bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded-full border border-zinc-200">
            {logs.length} entries
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={expandAll}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-zinc-600 hover:bg-zinc-100 rounded transition-colors"
          >
            <Plus size={12} /> EXPAND ALL
          </button>
          <button 
            onClick={collapseAll}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-zinc-600 hover:bg-zinc-100 rounded transition-colors"
          >
            <Minus size={12} /> COLLAPSE ALL
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {logs.slice().reverse().map((log, idx) => {
          const isExpanded = expandedEntries[log.id];
          const requestExpanded = expandedSections[`${log.id}-request`];
          const responseExpanded = expandedSections[`${log.id}-response`];

          return (
            <div key={log.id} className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
              {/* Header */}
              <button 
                onClick={() => toggleEntry(log.id)}
                className="w-full flex items-center justify-between p-3 hover:bg-zinc-50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-zinc-100 rounded-lg text-zinc-500">
                    {isExpanded ? <Minus size={14} /> : <Plus size={14} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-800">
                        Entry #{logs.length - idx}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400">
                        {log.request.model}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1 text-[10px] text-zinc-400">
                        <Clock size={10} />
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-zinc-400">
                        <Hash size={10} />
                        {log.response.usageMetadata?.totalTokenCount || 'N/A'} tokens
                      </div>
                      {log.response.text && (
                        <div className="flex items-center gap-1 text-[10px] text-zinc-400">
                          <MessageSquare size={10} />
                          {log.response.text.length} chars
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {log.response.usageMetadata && (
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-bold border border-indigo-100">
                        IN: {log.response.usageMetadata.promptTokenCount}
                      </span>
                      <span className="text-[9px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-bold border border-emerald-100">
                        OUT: {log.response.usageMetadata.candidatesTokenCount}
                      </span>
                    </div>
                  )}
                </div>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-zinc-100 overflow-hidden"
                  >
                    <div className="p-3 space-y-3">
                      {/* Request Section */}
                      <div className="border border-zinc-100 rounded-lg overflow-hidden">
                        <button 
                          onClick={() => toggleSection(log.id, 'request')}
                          className="w-full flex items-center justify-between p-2 bg-zinc-50 hover:bg-zinc-100 transition-colors text-left"
                        >
                          <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-600">
                            <MessageSquare size={12} />
                            REQUEST CONTEXT
                          </div>
                          {requestExpanded ? <Minus size={12} /> : <Plus size={12} />}
                        </button>
                        <AnimatePresence>
                          {requestExpanded && (
                            <motion.div 
                              initial={{ height: 0 }}
                              animate={{ height: 'auto' }}
                              exit={{ height: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="p-2 space-y-2 bg-white">
                                {log.request.systemInstruction && (
                                  <div className="space-y-1">
                                    <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">System Instruction</div>
                                    <pre className="p-2 bg-zinc-50 text-[10px] font-mono text-zinc-600 rounded border border-zinc-100 whitespace-pre-wrap max-h-40 overflow-y-auto">
                                      {log.request.systemInstruction}
                                    </pre>
                                  </div>
                                )}
                                <div className="space-y-1">
                                  <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">Contents (History & Current)</div>
                                  <pre className="p-2 bg-zinc-50 text-[10px] font-mono text-zinc-600 rounded border border-zinc-100 whitespace-pre-wrap max-h-80 overflow-y-auto">
                                    {JSON.stringify(log.request.contents, null, 2)}
                                  </pre>
                                </div>
                                {log.request.tools && log.request.tools.length > 0 && (
                                  <div className="space-y-1">
                                    <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">Tools / Skills</div>
                                    <pre className="p-2 bg-zinc-50 text-[10px] font-mono text-zinc-600 rounded border border-zinc-100 whitespace-pre-wrap max-h-40 overflow-y-auto">
                                      {JSON.stringify(log.request.tools, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                {log.request.config && (
                                  <div className="space-y-1">
                                    <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">Config</div>
                                    <pre className="p-2 bg-zinc-50 text-[10px] font-mono text-zinc-600 rounded border border-zinc-100 whitespace-pre-wrap max-h-40 overflow-y-auto">
                                      {JSON.stringify(log.request.config, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Response Section */}
                      <div className="border border-zinc-100 rounded-lg overflow-hidden">
                        <button 
                          onClick={() => toggleSection(log.id, 'response')}
                          className="w-full flex items-center justify-between p-2 bg-zinc-50 hover:bg-zinc-100 transition-colors text-left"
                        >
                          <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-600">
                            <Cpu size={12} />
                            LLM RESPONSE
                          </div>
                          {responseExpanded ? <Minus size={12} /> : <Plus size={12} />}
                        </button>
                        <AnimatePresence>
                          {responseExpanded && (
                            <motion.div 
                              initial={{ height: 0 }}
                              animate={{ height: 'auto' }}
                              exit={{ height: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="p-2 space-y-2 bg-white">
                                <div className="space-y-1">
                                  <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">Generated Text ({log.response.text?.length || 0} chars)</div>
                                  <pre className="p-2 bg-zinc-50 text-[10px] font-mono text-zinc-600 rounded border border-zinc-100 whitespace-pre-wrap max-h-80 overflow-y-auto">
                                    {log.response.text}
                                  </pre>
                                </div>
                                {log.response.functionCalls && log.response.functionCalls.length > 0 && (
                                  <div className="space-y-1">
                                    <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">Function Calls</div>
                                    <pre className="p-2 bg-zinc-50 text-[10px] font-mono text-zinc-600 rounded border border-zinc-100 whitespace-pre-wrap max-h-40 overflow-y-auto">
                                      {JSON.stringify(log.response.functionCalls, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                <div className="space-y-1">
                                  <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">Usage Metadata</div>
                                  <pre className="p-2 bg-zinc-50 text-[10px] font-mono text-zinc-600 rounded border border-zinc-100 whitespace-pre-wrap">
                                    {JSON.stringify(log.response.usageMetadata, null, 2)}
                                  </pre>
                                </div>
                                {log.response.raw && (
                                  <div className="space-y-1">
                                    <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">Raw Response</div>
                                    <pre className="p-2 bg-zinc-50 text-[10px] font-mono text-zinc-600 rounded border border-zinc-100 whitespace-pre-wrap max-h-40 overflow-y-auto">
                                      {JSON.stringify(log.response.raw, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
};

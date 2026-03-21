/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatPanel } from './components/ChatPanel';
import { ArtifactPanel } from './components/ArtifactPanel';
import { SkillsPanel } from './components/SkillsPanel';
import { MCPPanel } from './components/MCPPanel';
import { useSessions } from './hooks/useSession';
import { streamResponse, fetchOllamaModels } from './engines/streamEngine';
import { parseArtifact, parsePatches, applyPatches, stripArtifactsAndPatches, parseThought } from './engines/patchEngine';
import { Message, Attachment, Artifact, OllamaConfig, Skill, MCPConfig } from './types';
import { generateId } from './utils';
import { motion, AnimatePresence } from 'motion/react';
import { Layers, Diff, FolderOpen, AlertCircle, Loader2 } from 'lucide-react';
import { 
  getStoredDirectoryHandle, 
  selectLocalDirectory, 
  requestPermission, 
  checkPermission,
  saveAppState,
  loadAppState,
  storeDirectoryHandle,
  clearStoredDirectoryHandle,
  getWorkspaceTree
} from './services/fileSystemService';

export default function App() {
  const [workspaceHandle, setWorkspaceHandle] = useState<any | null>(null);
  const [workspaceTree, setWorkspaceTree] = useState<any | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isStateLoaded = useRef(false);

  const {
    sessions,
    currentSession,
    currentSessionId,
    setCurrentSessionId,
    createSession,
    updateSession,
    deleteSession,
    addMessage,
    addArtifact,
    setSessions
  } = useSessions();

  const [provider, setProvider] = useState<'gemini' | 'ollama'>('gemini');
  const [skills, setSkills] = useState<Skill[]>([]);
  const [mcpConfigs, setMcpConfigs] = useState<MCPConfig[]>([]);
  const [ollamaConfig, setOllamaConfig] = useState<OllamaConfig>({
    baseUrl: 'http://localhost:11434',
    selectedModel: 'llama3'
  });
  const [activeTab, setActiveTab] = useState<'chats' | 'skills' | 'mcp'>('chats');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [availableModels, setAvailableModels] = useState<string[]>(['llama3']);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [streamingArtifact, setStreamingArtifact] = useState<{ type: string; title: string; content: string } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [chatWidth, setChatWidth] = useState(500);
  const [isResizing, setIsResizing] = useState(false);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);

  const updateWorkspaceTree = async (handle: any) => {
    try {
      // Try to verify the handle is still valid by doing a simple operation
      const tree = await getWorkspaceTree(handle);
      setWorkspaceTree(tree);
    } catch (err: any) {
      console.error('Failed to update workspace tree:', err);
      // If the folder was deleted or moved, clear the handle
      // File System API throws NotFoundError when the underlying file/folder is gone
      if (err.name === 'NotFoundError' || err.message?.toLowerCase().includes('not found')) {
        console.warn('Workspace folder not found. Clearing handle.');
        await handleDisconnectWorkspace();
      }
    }
  };

  const handleDisconnectWorkspace = async () => {
    await clearStoredDirectoryHandle();
    setWorkspaceHandle(null);
    setWorkspaceTree(null);
    setSelectedFilePath(null);
  };

  // Initialize workspace
  useEffect(() => {
    console.log('App: Initializing workspace...');
    const initWorkspace = async () => {
      try {
        const storedHandle = await getStoredDirectoryHandle();
        if (storedHandle) {
          try {
            const hasPermission = await checkPermission(storedHandle);
            if (hasPermission) {
              await loadAllState(storedHandle);
              setWorkspaceHandle(storedHandle);
              try {
                await updateWorkspaceTree(storedHandle);
              } catch (err) {
                console.error('Initial workspace scan failed:', err);
              }
              // Wait for state updates to settle before enabling auto-save
              setTimeout(() => {
                isStateLoaded.current = true;
              }, 1500);
            } else {
              console.log('Workspace handle found but permission not granted. Showing connect screen.');
            }
          } catch (err: any) {
            console.error('Workspace permission/load error:', err);
            // If the folder was deleted or moved, clear the handle
            if (err.name === 'NotFoundError' || err.message?.toLowerCase().includes('not found')) {
              console.warn('Stored workspace handle is invalid. Clearing storage.');
              await handleDisconnectWorkspace();
              setError('The previously selected workspace folder was not found. Please select a new folder.');
            }
          }
        }
      } catch (err) {
        console.error('Workspace init error:', err);
      } finally {
        setIsInitializing(false);
      }
    };
    initWorkspace();
  }, []);

  const loadAllState = async (handle: any) => {
    const savedSessions = await loadAppState(handle, 'sessions');
    if (savedSessions) {
      setSessions(savedSessions);
      if (savedSessions.length > 0) {
        setCurrentSessionId(savedSessions[0].id);
      }
      lastSavedRef.current['sessions'] = JSON.stringify(savedSessions, null, 2);
    }

    const savedSkills = await loadAppState(handle, 'skills');
    if (savedSkills) {
      setSkills(savedSkills);
      lastSavedRef.current['skills'] = JSON.stringify(savedSkills, null, 2);
    }

    const savedMcp = await loadAppState(handle, 'mcp');
    if (savedMcp) {
      setMcpConfigs(savedMcp);
      lastSavedRef.current['mcp'] = JSON.stringify(savedMcp, null, 2);
    }

    const savedProvider = await loadAppState(handle, 'provider');
    if (savedProvider) {
      setProvider(savedProvider);
      lastSavedRef.current['provider'] = JSON.stringify(savedProvider, null, 2);
    }

    const savedOllama = await loadAppState(handle, 'ollama');
    if (savedOllama) {
      setOllamaConfig(savedOllama);
      lastSavedRef.current['ollama'] = JSON.stringify(savedOllama, null, 2);
    }
  };

  // Save state to disk whenever it changes (debounced)
  const lastSavedRef = useRef<Record<string, string>>({});

  useEffect(() => {
    if (!workspaceHandle || !isStateLoaded.current) return;

    const saveState = async () => {
      console.log('App: Checking for state changes to save...');
      const states = [
        { key: 'sessions', data: sessions },
        { key: 'skills', data: skills },
        { key: 'mcp', data: mcpConfigs },
        { key: 'provider', data: provider },
        { key: 'ollama', data: ollamaConfig }
      ];

      for (const { key, data } of states) {
        const serialized = JSON.stringify(data, null, 2);
        if (lastSavedRef.current[key] !== serialized) {
          console.log(`App: Saving ${key} to disk...`);
          await saveAppState(workspaceHandle, key, data);
          lastSavedRef.current[key] = serialized;
        }
      }
    };

    const timeoutId = setTimeout(saveState, 1000);
    return () => clearTimeout(timeoutId);
  }, [sessions, skills, mcpConfigs, provider, ollamaConfig, workspaceHandle]);

  const handleSelectWorkspace = async () => {
    try {
      setError(null);
      const handle = await selectLocalDirectory();
      if (handle) {
        await loadAllState(handle);
        setWorkspaceHandle(handle);
        await updateWorkspaceTree(handle);
        isStateLoaded.current = true;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to select workspace');
    }
  };

  const handleToggleSkill = (skillId: string) => {
    if (!currentSession) return;
    const activeSkills = currentSession.activeSkills || [];
    const newActiveSkills = activeSkills.includes(skillId)
      ? activeSkills.filter(id => id !== skillId)
      : [...activeSkills, skillId];
    updateSession({ activeSkills: newActiveSkills });
  };

  const handleAddSkill = (skill: Skill) => {
    setSkills(prev => [skill, ...prev]);
  };

  const handleUpdateSkill = (updatedSkill: Skill) => {
    setSkills(prev => prev.map(s => s.id === updatedSkill.id ? updatedSkill : s));
  };

  const handleDeleteSkill = (id: string) => {
    setSkills(prev => prev.filter(s => s.id !== id));
  };

  const handleAddMCP = (config: MCPConfig) => {
    setMcpConfigs(prev => [config, ...prev]);
  };

  const handleUpdateMCP = (updatedConfig: MCPConfig) => {
    setMcpConfigs(prev => prev.map(c => c.id === updatedConfig.id ? updatedConfig : c));
  };

  const handleDeleteMCP = (id: string) => {
    setMcpConfigs(prev => prev.filter(c => c.id !== id));
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const sidebarWidth = isSidebarOpen ? 280 : 0;
    const newWidth = e.clientX - sidebarWidth;
    if (newWidth > 300 && newWidth < window.innerWidth - 400) {
      setChatWidth(newWidth);
    }
  }, [isSidebarOpen]);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
    document.body.style.cursor = 'default';
    document.body.style.userSelect = 'auto';
  }, []);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', stopResizing);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, handleMouseMove, stopResizing]);

  const startResizing = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    if (provider === 'ollama') {
      fetchOllamaModels(ollamaConfig.baseUrl).then(models => {
        setAvailableModels(prev => {
          const combined = [...new Set([...models, ollamaConfig.selectedModel])];
          return combined;
        });
      });
    }
  }, [provider, ollamaConfig.baseUrl, ollamaConfig.selectedModel]);

  const handleOllamaConfigChange = (updates: Partial<OllamaConfig>) => {
    setOllamaConfig(prev => ({ ...prev, ...updates }));
  };

  const handleSendMessage = useCallback(async (content: string, attachments: Attachment[]) => {
    let sessionId = currentSession?.id;
    let initialMessages = currentSession?.messages || [];
    let initialArtifact = currentSession?.artifacts.find(a => a.id === currentSession.currentArtifactId) || null;
    
    if (!sessionId) {
      const newSession = createSession();
      sessionId = newSession.id;
      initialMessages = [];
      initialArtifact = null;
    }

    const activeSkills = skills.filter(s => currentSession?.activeSkills?.includes(s.id));
    const skillsContext = activeSkills.map(s => `SKILL: ${s.name}\n${s.content}`).join('\n\n');
    const activeMCPs = mcpConfigs.filter(c => c.enabled);
    const mcpContext = activeMCPs.length > 0 
      ? `ACTIVE MCP SERVERS: ${activeMCPs.map(c => c.name).join(', ')}` 
      : '';

    const fullPrompt = selectedFilePath 
      ? `CONTEXT: Currently working on file: ${selectedFilePath}\n\n${skillsContext}\n\n${mcpContext}\n\n${content}`
      : `${skillsContext}\n\n${mcpContext}\n\n${content}`;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: fullPrompt,
      attachments,
      timestamp: Date.now()
    };

    addMessage(userMessage, sessionId);
    setIsStreaming(true);
    setStreamingText('');
    setStreamingArtifact(null);

    const messages = [...initialMessages, userMessage];

    try {
      let fullResponse = '';
      const stream = streamResponse(
        provider,
        messages,
        { baseUrl: ollamaConfig.baseUrl, model: ollamaConfig.selectedModel },
        initialArtifact?.content,
        (controller) => { abortControllerRef.current = controller; }
      );

      for await (const chunk of stream) {
        if (chunk.text) {
          fullResponse = chunk.fullText;
          setStreamingText(fullResponse);
          const partialArtifact = parseArtifact(fullResponse);
          if (partialArtifact) {
            setStreamingArtifact(partialArtifact as any);
          }
        }
      }

      const patches = parsePatches(fullResponse);
      const thought = parseThought(fullResponse);
      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: stripArtifactsAndPatches(fullResponse),
        thought: thought || undefined,
        timestamp: Date.now(),
        patches: patches.length > 0 ? patches : undefined
      };
      addMessage(assistantMessage, sessionId);

      const newArtifactData = parseArtifact(fullResponse);
      if (newArtifactData) {
        let files: any[] | undefined;
        if (newArtifactData.type === 'project') {
          try {
            files = JSON.parse(newArtifactData.content);
            files = files.map(f => ({ ...f, id: generateId() }));
          } catch (e) {
            console.error('Failed to parse project artifact JSON', e);
          }
        }

        const newArtifact: Artifact = {
          id: generateId(),
          type: newArtifactData.type as any,
          title: newArtifactData.title,
          content: newArtifactData.content,
          files,
          version: 1,
          timestamp: Date.now()
        };
        addArtifact(newArtifact, sessionId);
      } else if (initialArtifact) {
        const patches = parsePatches(fullResponse);
        if (patches.length > 0) {
          const { content: patchedContent, successCount } = applyPatches(initialArtifact.content, patches);
          if (successCount > 0) {
            const updatedArtifact: Artifact = {
              ...initialArtifact,
              id: generateId(),
              content: patchedContent,
              version: initialArtifact.version + 1,
              timestamp: Date.now()
            };
            addArtifact(updatedArtifact, sessionId);
          }
        }
      }

      if (messages.length === 1) {
        updateSession({ title: content.substring(0, 30) + (content.length > 30 ? '...' : '') }, sessionId);
      }

    } catch (error) {
      console.error('Streaming error:', error);
      addMessage({
        id: generateId(),
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your request.',
        timestamp: Date.now()
      }, sessionId);
    } finally {
      setIsStreaming(false);
      setStreamingText('');
      setStreamingArtifact(null);
      abortControllerRef.current = null;
    }
  }, [currentSession, addMessage, addArtifact, updateSession, provider, ollamaConfig, skills, mcpConfigs, createSession]);

  const handleVersionSelect = (index: number) => {
    if (!currentSession) return;
    const selectedArtifact = currentSession.artifacts[index];
    updateSession({ currentArtifactId: selectedArtifact.id });
  };

  const handleSaveArtifact = (content: string) => {
    if (!currentArtifact) return;
    const updatedArtifact: Artifact = {
      ...currentArtifact,
      id: generateId(),
      content,
      version: currentArtifact.version + 1,
      timestamp: Date.now()
    };
    addArtifact(updatedArtifact);
  };

  const currentArtifact = currentSession?.artifacts.find(a => a.id === currentSession.currentArtifactId) || null;
  const currentIndex = currentSession?.artifacts.findIndex(a => a.id === currentSession.currentArtifactId) ?? -1;

  const workspaceArtifact: Artifact = {
    id: 'workspace-explorer',
    type: 'project',
    title: 'Workspace Explorer',
    content: '[]',
    files: [],
    version: 1,
    timestamp: Date.now()
  };

  const displayArtifact = isStreaming && streamingArtifact ? {
    id: 'streaming',
    ...streamingArtifact,
    version: currentArtifact ? currentArtifact.version : 1,
    timestamp: Date.now()
  } as Artifact : (currentArtifact || workspaceArtifact);

  if (isInitializing) {
    return (
      <div className="h-screen w-full bg-zinc-950 flex flex-col items-center justify-center text-white font-sans">
        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
        <div className="text-zinc-400 animate-pulse">Initializing Workspace...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-zinc-100 font-sans text-zinc-900 overflow-hidden relative">
      {isResizing && (
        <div 
          className="fixed inset-0 z-[9999] cursor-col-resize"
          onMouseMove={(e) => handleMouseMove(e.nativeEvent)}
          onMouseUp={stopResizing}
        />
      )}
      <Sidebar 
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSessionSelect={setCurrentSessionId}
        onNewSession={createSession}
        onDeleteSession={deleteSession}
        provider={provider}
        onProviderChange={setProvider}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      >
        {activeTab === 'skills' && (
          <SkillsPanel 
            skills={skills}
            onAddSkill={handleAddSkill}
            onUpdateSkill={handleUpdateSkill}
            onDeleteSkill={handleDeleteSkill}
            activeSkillIds={currentSession?.activeSkills || []}
            onToggleSkill={handleToggleSkill}
          />
        )}
        {activeTab === 'mcp' && (
          <MCPPanel 
            configs={mcpConfigs}
            onAddConfig={handleAddMCP}
            onUpdateConfig={handleUpdateMCP}
            onDeleteConfig={handleDeleteMCP}
          />
        )}
      </Sidebar>

      <main className="flex-1 flex overflow-hidden relative">
        {!workspaceHandle ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 bg-zinc-50 text-center">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-md w-full bg-white border border-zinc-200 rounded-[32px] p-10 shadow-xl"
            >
              <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <FolderOpen className="w-8 h-8 text-emerald-500" />
              </div>
              
              <h2 className="text-2xl font-bold text-zinc-800 mb-3">Connect Workspace</h2>
              <p className="text-zinc-500 mb-8 text-sm leading-relaxed">
                To start using Artifact Studio, please select a local folder where all your projects, chats, and settings will be stored.
              </p>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600 text-xs text-left">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>{error}</div>
                </div>
              )}

              <button 
                onClick={handleSelectWorkspace}
                className="w-full py-4 bg-zinc-800 hover:bg-zinc-900 text-white font-bold rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 group"
              >
                Select Workspace Folder
                <motion.span
                  animate={{ x: [0, 4, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  →
                </motion.span>
              </button>
            </motion.div>
          </div>
        ) : (
          <>
            <div style={{ width: chatWidth }} className="flex-shrink-0 flex flex-col">
          <ChatPanel 
            messages={currentSession?.messages || []}
            onSendMessage={handleSendMessage}
            isStreaming={isStreaming}
            provider={provider}
            ollamaConfig={ollamaConfig}
            availableModels={availableModels}
            onOllamaConfigChange={handleOllamaConfigChange}
            isSidebarOpen={isSidebarOpen}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          />
        </div>

        <div 
          onMouseDown={startResizing}
          className="w-1.5 h-full bg-zinc-200 hover:bg-zinc-400 cursor-col-resize transition-colors z-30 flex-shrink-0 flex items-center justify-center group"
        >
          <div className="w-0.5 h-8 bg-zinc-300 group-hover:bg-zinc-500 rounded-full" />
        </div>

        <div className="flex-1 flex flex-col min-w-0 relative">
          <ArtifactPanel 
            artifact={displayArtifact}
            history={currentSession?.artifacts || []}
            onVersionSelect={handleVersionSelect}
            currentIndex={currentIndex}
            onSave={handleSaveArtifact}
            isStreaming={isStreaming}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            isSidebarOpen={isSidebarOpen}
            workspaceHandle={workspaceHandle}
            workspaceTree={workspaceTree}
            onRefreshTree={() => updateWorkspaceTree(workspaceHandle)}
            onDisconnectWorkspace={handleDisconnectWorkspace}
            selectedFilePath={selectedFilePath}
            onFileSelect={setSelectedFilePath}
          />
          
          <AnimatePresence>
            {isStreaming && streamingText.includes('<artifact') && !streamingText.includes('</artifact>') && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur shadow-2xl border border-zinc-200 rounded-2xl px-6 py-4 flex items-center gap-4 z-50"
              >
                <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-white animate-pulse">
                  <Layers size={20} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-zinc-800">Generating Artifact...</div>
                  <div className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Streaming content</div>
                </div>
              </motion.div>
            )}

            {isStreaming && streamingText.includes('<patch') && !streamingText.includes('</patch>') && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur shadow-2xl border border-zinc-200 rounded-2xl px-6 py-4 flex items-center gap-4 z-50"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white animate-pulse">
                  <Diff size={20} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-zinc-800">Applying Patches...</div>
                  <div className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Updating code</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </>
    )}
  </main>
</div>
);
}

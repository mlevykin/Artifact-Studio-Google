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
import { 
  parseArtifacts, 
  parsePatches, 
  applyPatches, 
  stripArtifactsAndPatches, 
  parseThought,
  parseInvokedSkills,
  parseMcpCalls,
  parsePartialArtifact,
  parsePartialPatches,
  truncateAfterToolCall,
  parseMessageSteps
} from './engines/patchEngine';
import { Message, Attachment, Artifact, OllamaConfig, Skill, MCPConfig } from './types';
import { generateId } from './utils';
import { MCPService } from './services/mcpService';
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
    if (currentSession) {
      updateSession({ selectedFilePath: null });
    }
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

  const handleToggleMcp = (mcpId: string) => {
    if (!currentSession) return;
    const activeMcpIds = currentSession.activeMcpIds || [];
    const newActiveMcpIds = activeMcpIds.includes(mcpId)
      ? activeMcpIds.filter(id => id !== mcpId)
      : [...activeMcpIds, mcpId];
    updateSession({ activeMcpIds: newActiveMcpIds });
  };

  const handleToggleAutoSelect = () => {
    if (!currentSession) return;
    updateSession({ autoSelectSkills: !currentSession.autoSelectSkills });
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

  const handleDeleteSession = async (id: string) => {
    if (workspaceHandle) {
      const { deleteSessionFolder } = await import('./services/fileSystemService');
      await deleteSessionFolder(workspaceHandle, id);
      // Refresh tree to show folder is gone
      updateWorkspaceTree(workspaceHandle);
    }
    deleteSession(id);
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
    let isAutoSelect = currentSession?.autoSelectSkills;
    let sessionActiveSkills = currentSession?.activeSkills || [];
    let sessionActiveMcpIds = currentSession?.activeMcpIds || [];
    let selectedFilePath = currentSession?.selectedFilePath;
    
    if (!sessionId) {
      const newSession = createSession();
      sessionId = newSession.id;
      initialMessages = [];
      initialArtifact = null;
      isAutoSelect = false;
      sessionActiveSkills = [];
      sessionActiveMcpIds = [];
      selectedFilePath = null;
    }

    const activeSkills = skills.filter(s => sessionActiveSkills.includes(s.id));
    const activeMCPs = mcpConfigs.filter(c => sessionActiveMcpIds.includes(c.id));

    let skillsContext = '';
    let mcpContext = '';

    const reportingInstruction = `
IMPORTANT: When you use a skill or an MCP server, you MUST report it at the beginning of your response using these tags.
Each tag MUST include a "description" attribute explaining what you are doing in a human-readable way.
- For skills: <skill_call name="Skill Name" description="Human-readable description of what this skill adds to the context" />
- For MCP: <mcp_call name="MCP Name" description="Human-readable description of why you are calling this tool"><request>JSON_REQUEST</request></mcp_call>
Wait for the system to provide the <response> tag before continuing your task if the tool output is required.

CRITICAL RULES FOR CONTENT:
1. DO NOT write any code, scripts, structured documents, architecture plans, or long specifications directly in the chat text.
2. ALL structured content MUST be wrapped in <artifact> tags. This includes Markdown documents, specifications, and requirements.
3. If you need to provide multiple files or diagrams, use ONE artifact of type="project" and provide a JSON array of files.
4. The chat text should ONLY contain brief explanations, summaries, and conversational guidance.
5. Do NOT mention skill or MCP calls in the visible chat text; use the tags instead.
6. If you are generating a document, use <artifact type="markdown" title="Document Title">...</artifact>.
7. In a new chat (no previous messages), assume you are starting from scratch unless the user provides context or attachments.
`;

    if (isAutoSelect) {
      skillsContext = `AUTO-SELECT SKILLS ENABLED: You have access to all skills. Choose the most relevant one if needed. Available skills: ${skills.map(s => s.name).join(', ')}\n${reportingInstruction}`;
      mcpContext = `AUTO-SELECT MCP ENABLED: You have access to all MCP servers.
IMPORTANT: If the user asks for "available tools", "list tools", or "what can you do", you MUST use the <mcp_call> tag with {"method": "list_tools"} for transparency, even if you see the tools below.
Available MCPs and their tools:
${mcpConfigs.map(c => {
  const toolsList = c.tools?.map(t => `- ${t.name}: ${t.description || 'No description'}`).join('\n') || 'No tools listed (use list_tools to see tools)';
  return `Server: ${c.name}\nTools:\n${toolsList}`;
}).join('\n\n')}`;
    } else {
      skillsContext = activeSkills.length > 0 
        ? activeSkills.map(s => `SKILL: ${s.name}\n${s.content}`).join('\n\n') + `\n${reportingInstruction}`
        : '';
      mcpContext = activeMCPs.length > 0 
        ? `ACTIVE MCP SERVERS AND THEIR TOOLS:
IMPORTANT: If the user asks for "available tools", "list tools", or "what can you do", you MUST use the <mcp_call> tag with {"method": "list_tools"} for transparency, even if you see the tools below.
${activeMCPs.map(c => {
  const toolsList = c.tools?.map(t => `- ${t.name}: ${t.description || 'No description'}`).join('\n') || 'No tools listed (use list_tools to see tools)';
  return `Server: ${c.name}\nTools:\n${toolsList}`;
}).join('\n\n')}` 
        : '';
    }

    const fullPrompt = selectedFilePath 
      ? `CONTEXT: Currently working on file: ${selectedFilePath}\n\n${skillsContext}\n\n${mcpContext}\n\n${content}`
      : `${skillsContext}\n\n${mcpContext}\n\n${content}`;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: content,
      attachments,
      timestamp: Date.now()
    };

    addMessage(userMessage, sessionId);
    setIsStreaming(true);
    setStreamingText('');
    setStreamingArtifact(null);

    let currentMessages = [...initialMessages, userMessage];
    let currentPrompt = fullPrompt;
    let turnCount = 0;
    const maxTurns = 10;

    try {
      while (turnCount < maxTurns) {
        setStreamingText('');
        setStreamingArtifact(null);
        let fullResponse = '';
        const stream = streamResponse(
          provider,
          currentMessages,
          ollamaConfig,
          initialArtifact,
          (controller) => { abortControllerRef.current = controller; },
          currentPrompt
        );

        for await (const chunk of stream) {
          if (chunk.text) {
            fullResponse = chunk.fullText;
            const displayResponse = truncateAfterToolCall(fullResponse);
            setStreamingText(displayResponse);
            
            const partialArtifact = parsePartialArtifact(displayResponse);
            if (partialArtifact) {
              setStreamingArtifact(partialArtifact as any);
            }
          }
        }

        const truncatedResponse = truncateAfterToolCall(fullResponse);
        const patches = parsePatches(truncatedResponse);
        const thought = parseThought(truncatedResponse);
        const invokedSkills = parseInvokedSkills(truncatedResponse);
        const mcpCalls = parseMcpCalls(truncatedResponse);

        // Execute MCP calls if any
        const executedMcpCalls = [];
        let needsNextTurn = false;
        
        if (mcpCalls.length > 0) {
          setStreamingText(''); // Clear to show "Thinking" during tool execution
          for (const call of mcpCalls) {
            const mcpConfig = mcpConfigs.find(c => c.name === call.name || c.id === call.name);
            if (mcpConfig && mcpConfig.enabled) {
              try {
                // Handle virtual "list_tools" call
                if (call.request?.method === 'list_tools') {
                  const tools = mcpConfig.tools || [];
                  executedMcpCalls.push({ ...call, response: { tools, status: 'success' } });
                } else {
                  const { tool, arguments: args } = call.request;
                  const result = await MCPService.callTool(mcpConfig, tool || call.request.name, args || call.request.args || {});
                  executedMcpCalls.push({ ...call, response: result });
                }
                needsNextTurn = true;
              } catch (error: any) {
                executedMcpCalls.push({ ...call, response: { error: error.message } });
                needsNextTurn = true;
              }
            } else {
              executedMcpCalls.push({ ...call, response: { error: `MCP Server "${call.name}" not found or disabled.` } });
              needsNextTurn = true;
            }
          }
        }

        const steps = parseMessageSteps(truncatedResponse, executedMcpCalls);

        const assistantMessage: Message = {
          id: generateId(),
          role: 'assistant',
          content: stripArtifactsAndPatches(truncatedResponse),
          thought: thought || undefined,
          timestamp: Date.now(),
          patches: patches.length > 0 ? patches : undefined,
          invokedSkills: invokedSkills.length > 0 ? invokedSkills : undefined,
          mcpCalls: executedMcpCalls.length > 0 ? executedMcpCalls : undefined,
          steps: steps.length > 0 ? steps : undefined
        };

        addMessage(assistantMessage, sessionId);
        currentMessages.push(assistantMessage);

        // Handle patches for the current artifact within this turn
        if (initialArtifact && patches.length > 0) {
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
            // Update initialArtifact for next potential turn's patches
            initialArtifact = updatedArtifact;
          }
        }

        // Handle new artifacts within this turn
        const newArtifacts = parseArtifacts(truncatedResponse);
        newArtifacts.forEach(newArtifactData => {
          // Find if this artifact already exists in the session (by ID or Title+Type)
          const currentSessionObj = sessions.find(s => s.id === sessionId);
          const existingArtifact = currentSessionObj?.artifacts.find(a => 
            (newArtifactData.id && a.id === newArtifactData.id) || 
            (!newArtifactData.id && a.title === newArtifactData.title && a.type === newArtifactData.type)
          );

          let files: any[] | undefined;
          if (newArtifactData.type === 'project') {
            try {
              files = JSON.parse(newArtifactData.content);
              files = files.map(f => ({ ...f, id: generateId() }));
            } catch (e) {
              console.error('Failed to parse project artifact JSON', e);
            }
          }

          if (existingArtifact) {
            // Update existing artifact (new version)
            const updatedArtifact: Artifact = {
              ...existingArtifact,
              id: generateId(),
              content: newArtifactData.content,
              files,
              version: existingArtifact.version + 1,
              timestamp: Date.now()
            };
            addArtifact(updatedArtifact, sessionId);
          } else {
            // Create new artifact
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
          }
        });

        if (needsNextTurn) {
          const resultsPrompt = executedMcpCalls.map(c => 
            `<response>\n${JSON.stringify(c.response, null, 2)}\n</response>`
          ).join('\n\n');
          
          // Add the results as a new user message for the next turn
          const resultsMessage: Message = {
            id: generateId(),
            role: 'user',
            content: resultsPrompt,
            isSystemGenerated: true,
            timestamp: Date.now()
          };
          
          addMessage(resultsMessage, sessionId);
          currentMessages.push(resultsMessage);
          currentPrompt = ''; // We use the message history now
          turnCount++;
          continue;
        } else {
          break;
        }
      }

      if (initialMessages.length === 0) {
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
        onDeleteSession={handleDeleteSession}
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
            autoSelectSkills={currentSession?.autoSelectSkills || false}
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
            streamingText={streamingText}
            provider={provider}
            ollamaConfig={ollamaConfig}
            availableModels={availableModels}
            onOllamaConfigChange={handleOllamaConfigChange}
            isSidebarOpen={isSidebarOpen}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            skills={skills}
            mcpConfigs={mcpConfigs}
            activeSkillIds={currentSession?.activeSkills || []}
            onToggleSkill={handleToggleSkill}
            activeMcpIds={currentSession?.activeMcpIds || []}
            onToggleMcp={handleToggleMcp}
            autoSelectSkills={currentSession?.autoSelectSkills || false}
            onToggleAutoSelect={handleToggleAutoSelect}
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
            selectedFilePath={currentSession?.selectedFilePath || null}
            onFileSelect={(path) => updateSession({ selectedFilePath: path })}
            sessionId={currentSession?.id}
            streamingText={streamingText}
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
                  <div className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold flex items-center gap-2">
                    Updating code
                    {parsePartialPatches(streamingText).length > 0 && (
                      <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full text-[8px]">
                        {parsePartialPatches(streamingText).length} detected
                      </span>
                    )}
                  </div>
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

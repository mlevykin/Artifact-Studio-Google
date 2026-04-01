/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { ProjectPanel } from './components/ProjectPanel';
import { Sidebar } from './components/Sidebar';
import { ChatPanel } from './components/ChatPanel';
import { ArtifactPanel } from './components/ArtifactPanel';
import { SkillsPanel } from './components/SkillsPanel';
import { MCPPanel } from './components/MCPPanel';
import { useSessions } from './hooks/useSession';
import { streamResponse, fetchOllamaModels, verifyArtifact } from './engines/streamEngine';
import { applyPatches } from './engines/patchEngine';
import { 
  parseArtifacts, 
  parsePatches, 
  stripArtifactsAndPatches, 
  parseThought,
  parseInvokedSkills,
  parseMcpCalls,
  parsePartialArtifact,
  parsePartialPatches,
  truncateAfterToolCall,
  parseMessageSteps
} from './engines/responseParser';
import { Message, Attachment, Artifact, OllamaConfig, Skill, MCPConfig, ContextSettings, ProjectConfig, Patch, ChatFolder } from './types';
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
  saveArtifact,
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
    folders,
    currentSession,
    currentSessionId,
    setCurrentSessionId,
    createSession,
    updateSession,
    deleteSession,
    addMessage,
    addArtifact,
    updateArtifact,
    updateMessage,
    removeMessage,
    addContextLog,
    setSessions,
    setFolders,
    createFolder,
    updateFolder,
    deleteFolder
  } = useSessions();

  const sessionsRef = useRef(sessions);
  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  const [provider, setProvider] = useState<'gemini' | 'ollama'>(() => {
    return (localStorage.getItem('provider') as 'gemini' | 'ollama') || 'gemini';
  });
  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => {
    return localStorage.getItem('geminiApiKey') || '';
  });
  const [geminiModel, setGeminiModel] = useState<string>(() => {
    return localStorage.getItem('geminiModel') || 'gemini-3-flash-preview';
  });
  const [webSearchEnabled, setWebSearchEnabled] = useState<boolean>(() => {
    return localStorage.getItem('webSearchEnabled') === 'true';
  });
  const [contextSettings, setContextSettings] = useState<ContextSettings>(() => {
    const saved = localStorage.getItem('contextSettings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse contextSettings from localStorage', e);
      }
    }
    return {
      includeSystemPrompt: true,
      includeChatHistory: true,
      includeAttachmentsHistory: true,
      includeArtifactContext: true,
      includeSkills: true,
      includeMcp: true,
      includeMultiChapter: false,
      targetDepth: 3
    };
  });
  const [skills, setSkills] = useState<Skill[]>([]);
  const [mcpConfigs, setMcpConfigs] = useState<MCPConfig[]>([]);
  const [ollamaConfig, setOllamaConfig] = useState<OllamaConfig>(() => {
    const saved = localStorage.getItem('ollamaConfig');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse ollamaConfig from localStorage', e);
      }
    }
    return {
      baseUrl: 'http://localhost:11434',
      selectedModel: 'llama3'
    };
  });

  // Persistence effects
  useEffect(() => {
    localStorage.setItem('provider', provider);
  }, [provider]);

  useEffect(() => {
    localStorage.setItem('geminiApiKey', geminiApiKey);
  }, [geminiApiKey]);

  useEffect(() => {
    localStorage.setItem('geminiModel', geminiModel);
  }, [geminiModel]);

  useEffect(() => {
    localStorage.setItem('webSearchEnabled', String(webSearchEnabled));
  }, [webSearchEnabled]);

  useEffect(() => {
    localStorage.setItem('ollamaConfig', JSON.stringify(ollamaConfig));
  }, [ollamaConfig]);

  useEffect(() => {
    localStorage.setItem('contextSettings', JSON.stringify(contextSettings));
  }, [contextSettings]);

  const [activeTab, setActiveTab] = useState<'chats' | 'skills' | 'mcp'>('chats');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [availableModels, setAvailableModels] = useState<string[]>(['llama3']);

  const [isStreaming, setIsStreaming] = useState(false);
  const [projects, setProjects] = useState<ProjectConfig[]>(() => {
    const saved = localStorage.getItem('projects');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('projects', JSON.stringify(projects));
  }, [projects]);

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
      
      // Populate lastSavedRef for individual artifacts to prevent redundant saves on startup
      for (const session of savedSessions) {
        if (!session.artifacts) continue;
        for (const artifact of session.artifacts) {
          const artKey = `artifact-${session.id}-${artifact.id}`;
          const artVersionKey = `${artKey}-v${artifact.version}`;
          lastSavedRef.current[artKey] = artifact.content;
          lastSavedRef.current[artVersionKey] = artifact.content;
        }
      }
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

    const savedFolders = await loadAppState(handle, 'folders');
    if (savedFolders) {
      setFolders(savedFolders);
      lastSavedRef.current['folders'] = JSON.stringify(savedFolders, null, 2);
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
        { key: 'folders', data: folders },
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

      // Save individual artifacts to the artifacts/ directory
      for (const session of sessions) {
        if (!session.artifacts) continue;
        const folder = folders.find(f => f.id === session.folderId);
        const folderName = folder ? folder.name : null;

        for (const artifact of session.artifacts) {
          const artKey = `artifact-${session.id}-${artifact.id}`;
          const artVersionKey = `${artKey}-v${artifact.version}`;
          
          if (lastSavedRef.current[artVersionKey] !== artifact.content) {
            console.log(`App: Saving artifact ${artifact.title} (v${artifact.version}) to disk...`);
            await saveArtifact(workspaceHandle, session.id, artifact, folderName);
            lastSavedRef.current[artVersionKey] = artifact.content;
            // Also update the base key to avoid redundant saves if content is same across versions (though version usually changes)
            lastSavedRef.current[artKey] = artifact.content;
            // Refresh the workspace tree to show the new/updated file
            await updateWorkspaceTree(workspaceHandle);
          }
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

  const handleToggleTester = (skillId: string) => {
    if (!currentSession) return;
    const testerSkillIds = currentSession.testerSkillIds || [];
    const newTesterSkillIds = testerSkillIds.includes(skillId)
      ? testerSkillIds.filter(id => id !== skillId)
      : [...testerSkillIds, skillId];
    updateSession({ testerSkillIds: newTesterSkillIds });
  };

  const handleApplyVerificationFixes = async (messageId: string) => {
    if (!currentSession) return;
    
    const message = currentSession.messages.find(m => m.id === messageId);
    if (!message || !message.verificationReport) return;
    
    const latestArtifact = currentSession.artifacts[currentSession.artifacts.length - 1];
    if (!latestArtifact) return;
    
    const patches = message.verificationReport.suggestedPatches;
    if (patches.length === 0) return;
    
    const { content: patchedContent, successCount } = applyPatches(latestArtifact.content, patches);
    
    if (successCount > 0) {
      // Add a temporary "Applying fixes" message
      const applyingMessageId = generateId();
      const applyingMessage: Message = {
        id: applyingMessageId,
        role: 'system',
        content: `🛠️ Applying ${successCount} fix(es) to ${latestArtifact.title}...`,
        timestamp: Date.now(),
        isSystemGenerated: true
      };
      addMessage(applyingMessage, currentSession.id);

      const updatedArtifact: Artifact = {
        ...latestArtifact,
        id: generateId(),
        content: patchedContent,
        version: latestArtifact.version + 1,
        timestamp: Date.now()
      };
      addArtifact(updatedArtifact, currentSession.id);
      
      // Update message status
      updateMessage(messageId, { 
        verificationReport: { ...message.verificationReport!, status: 'applied' } 
      }, currentSession.id);
      
      // Trigger re-verification
      const activeTesters = skills.filter(s => currentSession?.testerSkillIds?.includes(s.id));
      if (activeTesters.length > 0) {
        const progressMessageId = generateId();
        const progressMessage: Message = {
          id: progressMessageId,
          role: 'system',
          content: `🔍 Re-verifying fixes by ${activeTesters.map(t => t.name).join(', ')}...`,
          timestamp: Date.now(),
          isSystemGenerated: true
        };
        
        // Remove "Applying fixes" and add "Re-verifying"
        removeMessage(applyingMessageId, currentSession.id);
        addMessage(progressMessage, currentSession.id);

        try {
          const report = await verifyArtifact(updatedArtifact, activeTesters, geminiApiKey, geminiModel);
          
          // Remove the progress message and add the report
          removeMessage(progressMessageId, currentSession.id);
          
          if (report) {
            const verificationMessage: Message = {
              id: generateId(),
              role: 'system',
              content: `Re-verification report from ${report.testerName}`,
              timestamp: Date.now(),
              verificationReport: report
            };
            addMessage(verificationMessage, currentSession.id);
          }
        } catch (error) {
          console.error('Re-verification failed:', error);
          removeMessage(progressMessageId, currentSession.id);
        }
      } else {
        // Just remove the "Applying fixes" message if no testers
        removeMessage(applyingMessageId, currentSession.id);
      }
    } else {
      // Add a system message if patches failed to apply
      const errorMessage: Message = {
        id: generateId(),
        role: 'system',
        content: `⚠️ Failed to apply suggested patches. This can happen if the artifact content has changed or if the patches are not specific enough.`,
        timestamp: Date.now(),
        isSystemGenerated: true
      };
      addMessage(errorMessage, currentSession.id);
    }
  };

  const handleToggleAutoSelect = () => {
    if (!currentSession) return;
    updateSession({ autoSelectSkills: !currentSession.autoSelectSkills });
  };

  const handleAssembleProject = (sessionId?: string) => {
    const latestSessions = sessionsRef.current;
    
    // Try to find the session by ID, or fallback to current session
    let targetSession = sessionId 
      ? latestSessions.find(s => s.id === sessionId) 
      : latestSessions.find(s => s.id === currentSessionId);
    
    // If not found in ref yet (e.g. new session), try to use currentSession from props/state
    if (!targetSession && currentSession && (!sessionId || currentSession.id === sessionId)) {
      targetSession = currentSession;
    }
    
    if (!targetSession) {
      console.warn('handleAssembleProject: Target session not found', { sessionId, currentSessionId });
      return;
    }
    
    const artifacts = targetSession.artifacts || [];
    if (artifacts.length === 0) return;
    
    console.log('Assembling project from artifacts:', artifacts.map(a => a.title));
    
    // Find TOC if it exists
    const tocArtifact = artifacts.find(a => {
      const title = a.title.toLowerCase();
      return title.includes('table of contents') || 
             title.includes('оглавление') || 
             title.includes('содержание') || 
             title === 'toc' || 
             title.startsWith('toc:');
    });

    // Filter out TOC, technical artifacts, and existing Final Documents for the chapters list
    const chapters = artifacts.filter(a => {
      const title = a.title.toLowerCase();
      const isToc = title.includes('table of contents') || 
                    title.includes('оглавление') || 
                    title.includes('содержание') || 
                    title === 'toc' || 
                    title.startsWith('toc:');
      const isFinal = title.includes('final document') || 
                      title.includes('assembled document') ||
                      title.includes('итоговый документ');
      const isSystem = a.id === 'workspace-explorer' || a.id === 'streaming';
      const isTechnical = title === 'glossary' || 
                          title === 'cumulative summary' || 
                          title === 'summary' ||
                          title === 'style guide' ||
                          title === 'manifest';
      
      return !isToc && !isFinal && !isSystem && !isTechnical;
    });
    
    // Group chapters by title and take the latest version/timestamp
    const latestChaptersMap = new Map<string, Artifact>();
    chapters.forEach(chapter => {
      const existing = latestChaptersMap.get(chapter.title);
      if (!existing || (chapter.version > existing.version) || (chapter.version === existing.version && chapter.timestamp > existing.timestamp)) {
        latestChaptersMap.set(chapter.title, chapter);
      }
    });
    
    const uniqueChapters = Array.from(latestChaptersMap.values());
    
    console.log('Found unique chapters:', uniqueChapters.map(a => a.title));
    
    if (uniqueChapters.length === 0) {
      console.warn('No chapters found to assemble.');
      return;
    }
    
    // Helper to extract chapter number for reliable sorting
    const getChapterNumber = (title: string) => {
      const match = title.match(/(?:Chapter|Глава|Section|Part)\s*(\d+)/i) || title.match(/(\d+)/);
      return match ? parseInt(match[1], 10) : 999;
    };
    
    // Sort chapters by their numeric value to get them in order regardless of language (Chapter 1, Глава 2)
    const sortedChapters = [...uniqueChapters].sort((a, b) => getChapterNumber(a.title) - getChapterNumber(b.title));
    
    let finalContent = '';
    
    // Prepend TOC if found
    if (tocArtifact) {
      finalContent += `# ${tocArtifact.title}\n\n${tocArtifact.content}\n\n---\n\n`;
    }
    
    finalContent += sortedChapters.map(c => `## ${c.title}\n\n${c.content}`).join('\n\n---\n\n');
    
    const finalArtifact: Artifact = {
      id: generateId(),
      title: 'Final Document',
      type: 'markdown',
      content: finalContent,
      version: 1,
      timestamp: Date.now()
    };
    
    addArtifact(finalArtifact, targetSession.id);
    
    addMessage({
      id: generateId(),
      role: 'system',
      content: `✅ Final document assembled from ${sortedChapters.length} chapters${tocArtifact ? ' (including Table of Contents)' : ''}.`,
      timestamp: Date.now(),
      isSystemGenerated: true
    }, targetSession.id);
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
      const session = sessions.find(s => s.id === id);
      const folder = folders.find(f => f.id === session?.folderId);
      const { deleteSessionFolder } = await import('./services/fileSystemService');
      await deleteSessionFolder(workspaceHandle, id, folder?.name);
      // Refresh tree to show folder is gone
      updateWorkspaceTree(workspaceHandle);
    }
    deleteSession(id);
  };

  const handleMoveSessionToFolder = async (sessionId: string, folderId: string | null) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    const oldFolder = folders.find(f => f.id === session.folderId);
    const newFolder = folders.find(f => f.id === folderId);

    if (workspaceHandle) {
      const { moveSessionArtifacts } = await import('./services/fileSystemService');
      await moveSessionArtifacts(workspaceHandle, sessionId, oldFolder?.name || null, newFolder?.name || null);
      updateWorkspaceTree(workspaceHandle);
    }

    updateSession({ folderId }, sessionId);
  };

  const handleUpdateFolder = async (folderId: string, updates: Partial<ChatFolder>) => {
    if (updates.name) {
      const folder = folders.find(f => f.id === folderId);
      if (folder && folder.name !== updates.name) {
        // Rename folder on disk for all sessions in it
        const folderSessions = sessions.filter(s => s.folderId === folderId);
        if (workspaceHandle) {
          const { moveSessionArtifacts } = await import('./services/fileSystemService');
          for (const session of folderSessions) {
            try {
              await moveSessionArtifacts(workspaceHandle, session.id, folder.name, updates.name);
            } catch (error) {
              console.error(`Failed to move artifacts for session ${session.id} during folder rename:`, error);
            }
          }
          updateWorkspaceTree(workspaceHandle);
        }
      }
    }
    updateFolder(folderId, updates);
  };

  const handleDeleteFolder = async (folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    if (folder && workspaceHandle) {
      const folderSessions = sessions.filter(s => s.folderId === folderId);
      const { moveSessionArtifacts } = await import('./services/fileSystemService');
      for (const session of folderSessions) {
        try {
          // Move artifacts to root
          await moveSessionArtifacts(workspaceHandle, session.id, folder.name, null);
        } catch (error) {
          console.error(`Failed to move artifacts for session ${session.id} to root during folder deletion:`, error);
        }
      }
      updateWorkspaceTree(workspaceHandle);
    }
    deleteFolder(folderId);
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
    const activeMCPs = mcpConfigs.filter(c => c.enabled && sessionActiveMcpIds.includes(c.id));

    let skillsContext = '';
    let mcpContext = '';

    const commonReportingInstruction = `
CRITICAL RULES FOR CONTENT:
1. DO NOT write any code, scripts, structured documents, architecture plans, or long specifications directly in the chat text.
2. ALL structured content MUST be wrapped in <artifact> tags. This includes Markdown documents, specifications, and requirements.
3. If you need to provide multiple files or diagrams, use ONE artifact of type="project" and provide a JSON array of files.
4. The chat text should ONLY contain brief explanations, summaries, and conversational guidance.
5. Do NOT mention skill or MCP calls in the visible chat text; use the tags instead.
6. If you are generating a document, use <artifact type="markdown" title="Document Title">...</artifact>.
7. In a new chat (no previous messages), assume you are starting from scratch unless the user provides context or attachments.
8. RESPECT INTENT: NEVER generate an artifact or modify code unless the user explicitly asks for changes, improvements, or bug fixes. If the user is just asking a question or providing feedback, respond with text only.
9. **STRICT ARTIFACT RULE**: If you are providing content that belongs in a document (like a chapter, a section, or a diagram), you MUST use <artifact> or <patch>. NEVER output this content as plain text in the chat.
`;

    const skillReportingInstruction = `
IMPORTANT: When you use a skill, you MUST report it at the beginning of your response using this tag:
<skill_call name="ACTUAL_SKILL_NAME" description="Human-readable description of what this skill adds to the context" />
You do NOT need to wait for a response for skills as their content is already in your context. You MUST continue your response immediately after the tag.
`;

    const mcpReportingInstruction = `
IMPORTANT: When you use an MCP server, you MUST report it at the beginning of your response using this tag:
<mcp_call name="ACTUAL_SERVER_NAME" description="Human-readable description of why you are calling this tool"><request>JSON_REQUEST</request></mcp_call>
Wait for the system to provide the <response> tag before continuing your task if the tool output is required.
`;

    if (isAutoSelect && contextSettings.includeSkills) {
      skillsContext = `AUTO-SELECT SKILLS ENABLED: You have access to all skills. Choose the most relevant one if needed. Available skills: ${skills.map(s => s.name).join(', ')}\n${skillReportingInstruction}`;
    } else if (contextSettings.includeSkills) {
      skillsContext = activeSkills.length > 0 
        ? activeSkills.map(s => `SKILL: ${s.name}\n${s.content}`).join('\n\n') + `\n${skillReportingInstruction}`
        : '';
    }

    if (isAutoSelect && contextSettings.includeMcp) {
      mcpContext = `AUTO-SELECT MCP ENABLED: You have access to all MCP servers.
IMPORTANT: You MUST ONLY use the MCP servers and tools explicitly listed below. DO NOT try to guess server names or tools. If a server or tool is not in the list below, it DOES NOT EXIST.
Available MCPs and their tools:
${mcpConfigs.filter(c => c.enabled).map(c => {
  const toolsList = c.tools?.map(t => `- ${t.name}: ${t.description || 'No description'}`).join('\n') || 'No tools listed (use list_tools to see tools)';
  return `Server: ${c.name}\nTools:\n${toolsList}`;
}).join('\n\n')}\n${mcpReportingInstruction}`;
    } else if (contextSettings.includeMcp) {
      mcpContext = activeMCPs.length > 0 
        ? `ACTIVE MCP SERVERS AND THEIR TOOLS:
IMPORTANT: You MUST ONLY use the MCP servers and tools explicitly listed below. DO NOT try to guess server names or tools. If a server or tool is not in the list below, it DOES NOT EXIST.
${activeMCPs.map(c => {
  const toolsList = c.tools?.map(t => `- ${t.name}: ${t.description || 'No description'}`).join('\n') || 'No tools listed (use list_tools to see tools)';
  return `Server: ${c.name}\nTools:\n${toolsList}`;
}).join('\n\n')}\n${mcpReportingInstruction}` 
        : '';
    }

    let multiChapterInstruction = '';
    if (contextSettings.includeMultiChapter) {
      const artifacts = currentSession?.artifacts || [];
      const tocArtifact = artifacts.find(a => {
        const title = a.title.toLowerCase();
        return title.includes('table of contents') || 
               title.includes('оглавление') || 
               title.includes('содержание') || 
               title === 'toc';
      });
      
      if (tocArtifact) {
        // Count existing chapters to determine the next one
        const chapters = artifacts.filter(a => {
          const title = a.title.toLowerCase();
          const isToc = title.includes('table of contents') || title.includes('оглавление') || title.includes('содержание') || title === 'toc';
          const isFinal = title.includes('final document') || title.includes('assembled document') || title.includes('итоговый документ');
          const isSystem = a.id === 'workspace-explorer' || a.id === 'streaming';
          return !isToc && !isFinal && !isSystem && (title.includes('chapter') || title.includes('глава'));
        });
        
        const nextChapterNum = chapters.length + 1;
        multiChapterInstruction = `\n\n[CRITICAL INSTRUCTION: You are in Multi-Chapter Mode. Generate ONLY Chapter ${nextChapterNum}. DO NOT generate any other chapters. Focus on maximum detail for this single section. Within this chapter, use hierarchical numbering for sub-sections (e.g., ${nextChapterNum}.1, ${nextChapterNum}.2, etc.). Once Chapter ${nextChapterNum} is finished, STOP your response immediately. Do not combine multiple chapters.]`;
      }
    }

    const fullPrompt = `${skillsContext}\n\n${mcpContext}\n\n${commonReportingInstruction}\n\n${content}${multiChapterInstruction}`;

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
    let currentArtifacts = [...(currentSession?.artifacts || [])];
    let currentPrompt = fullPrompt;
    let turnCount = 0;
    let lastFullResponse = '';
    let hasCompletedSignal = false;
    const maxTurns = contextSettings.includeMultiChapter ? 30 : 10;

    try {
      while (turnCount < maxTurns) {
        setStreamingText('');
        setStreamingArtifact(null);
        let fullResponse = '';
        const activeSkillsData = skills.filter(s => currentSession?.activeSkills?.includes(s.id));
        const activeMcpData = mcpConfigs.filter(m => currentSession?.activeMcpIds?.includes(m.id));

        // Recalculate Multi-Chapter instruction for the current turn
        let turnMultiChapterInstruction = '';
        if (contextSettings.includeMultiChapter) {
          const tocArtifact = currentArtifacts.find(a => {
            const title = a.title.toLowerCase();
            return title.includes('table of contents') || title.includes('оглавление') || title.includes('содержание') || title === 'toc';
          });
          
          if (tocArtifact) {
            const chapters = currentArtifacts.filter(a => {
              const title = a.title.toLowerCase();
              const isToc = title.includes('table of contents') || title.includes('оглавление') || title.includes('содержание') || title === 'toc';
              const isFinal = title.includes('final document') || title.includes('assembled document') || title.includes('итоговый документ');
              const isSystem = a.id === 'workspace-explorer' || a.id === 'streaming';
              return !isToc && !isFinal && !isSystem && (title.includes('chapter') || title.includes('глава'));
            });
            const nextChapterNum = chapters.length + 1;
            turnMultiChapterInstruction = `\n\n[SYSTEM: Multi-Chapter Mode. Generate ONLY Chapter ${nextChapterNum}. Focus on maximum detail. Once finished, STOP. Do not combine chapters.]`;
          }
        }

        let retryCount = 0;
        const maxRetries = 3;
        let success = false;

        while (retryCount <= maxRetries) {
          try {
            // For multi-chapter mode, we want to minimize context after the first turn
            // to avoid sending full text of previous chapters.
            const turnContextSettings = {
              ...contextSettings,
              includeChatHistory: contextSettings.includeMultiChapter && turnCount > 0 ? false : contextSettings.includeChatHistory,
              // Also exclude artifact context if we are in multi-chapter mode to avoid sending the TOC/previous artifacts repeatedly
              includeArtifactContext: contextSettings.includeMultiChapter && turnCount > 0 ? false : contextSettings.includeArtifactContext
            };

            const stream = streamResponse(
              provider,
              currentMessages,
              ollamaConfig,
              initialArtifact,
              (controller) => { abortControllerRef.current = controller; },
              (log) => {
                console.log('Adding context log for turn:', turnCount + 1);
                addContextLog(log, sessionId);
              },
              turnCount === 0 ? (fullPrompt + turnMultiChapterInstruction) : (currentPrompt + turnMultiChapterInstruction),
              webSearchEnabled,
              geminiApiKey,
              geminiModel,
              turnContextSettings,
              activeSkillsData,
              activeMcpData
            );

            for await (const chunk of stream) {
              if (chunk.text) {
                fullResponse = chunk.fullText;
                lastFullResponse = fullResponse;
                const displayResponse = truncateAfterToolCall(fullResponse);
                setStreamingText(displayResponse);
                
                const partialArtifact = parsePartialArtifact(displayResponse);
                if (partialArtifact) {
                  setStreamingArtifact(partialArtifact as any);
                }
              }
            }
            success = true;
            break;
          } catch (error) {
            const errorStr = JSON.stringify(error);
            const is503 = errorStr.includes('503') || String(error).includes('503') || errorStr.includes('UNAVAILABLE');
            
            if (is503 && retryCount < maxRetries) {
              retryCount++;
              const delay = 2000 * Math.pow(2, retryCount - 1); // 2s, 4s, 8s
              console.warn(`Turn ${turnCount + 1}, Retry ${retryCount}/${maxRetries} after 503 error. Waiting ${delay}ms...`);
              
              // Show a temporary status message in the chat
              setStreamingText(`⚠️ Model is busy (503). Retrying in ${delay/1000}s... (Attempt ${retryCount}/${maxRetries})`);
              
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
            throw error;
          }
        }

        if (!success) break;

        if (!fullResponse.trim()) {
          setIsStreaming(false);
          setStreamingText('');
          return;
        }

        const truncatedResponse = truncateAfterToolCall(fullResponse);
        const patches = parsePatches(truncatedResponse);
        const thought = parseThought(truncatedResponse);
        const invokedSkills = parseInvokedSkills(truncatedResponse);
        const mcpCalls = parseMcpCalls(truncatedResponse);

        // Execute MCP calls if any
        const executedMcpCalls = [];
        let needsNextTurn = false;
        
        if (mcpCalls.length > 0 || invokedSkills.length > 0) {
          setStreamingText(''); // Clear to show "Thinking" during tool/skill processing
          if (mcpCalls.length > 0) {
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
                const availableServers = isAutoSelect ? mcpConfigs.map(c => c.name).join(', ') : activeMCPs.map(c => c.name).join(', ');
                executedMcpCalls.push({ ...call, response: { error: `MCP Server "${call.name}" not found or disabled. AVAILABLE SERVERS: ${availableServers}` } });
                needsNextTurn = true;
              }
            }
          }
          
          if (invokedSkills.length > 0) {
            needsNextTurn = true;
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

        // Handle patches for artifacts within this turn
        if (patches.length > 0) {
          // Group patches by target
          const patchesByTarget = new Map<string, Patch[]>();
          const untargetedPatches: Patch[] = [];
          
          patches.forEach(p => {
            if (p.artifactId) {
              const target = patchesByTarget.get(p.artifactId) || [];
              target.push(p);
              patchesByTarget.set(p.artifactId, target);
            } else if (p.title) {
              const target = patchesByTarget.get(p.title) || [];
              target.push(p);
              patchesByTarget.set(p.title, target);
            } else {
              untargetedPatches.push(p);
            }
          });

          // Apply targeted patches
          patchesByTarget.forEach((targetPatches, targetIdOrTitle) => {
            const targetArtifact = currentArtifacts.find(a => a.id === targetIdOrTitle || a.title === targetIdOrTitle);
            if (targetArtifact) {
              const { content: patchedContent, successCount } = applyPatches(targetArtifact.content, targetPatches);
              if (successCount > 0) {
                const updatedArtifact: Artifact = {
                  ...targetArtifact,
                  id: generateId(),
                  content: patchedContent,
                  version: targetArtifact.version + 1,
                  timestamp: Date.now()
                };
                addArtifact(updatedArtifact, sessionId);
                currentArtifacts.push(updatedArtifact);
                if (initialArtifact?.id === targetArtifact.id) initialArtifact = updatedArtifact;
              }
            }
          });

          // Apply untargeted patches to initialArtifact
          if (initialArtifact && untargetedPatches.length > 0) {
            const { content: patchedContent, successCount } = applyPatches(initialArtifact.content, untargetedPatches);
            if (successCount > 0) {
              const updatedArtifact: Artifact = {
                ...initialArtifact,
                id: generateId(),
                content: patchedContent,
                version: initialArtifact.version + 1,
                timestamp: Date.now()
              };
              addArtifact(updatedArtifact, sessionId);
              currentArtifacts.push(updatedArtifact);
              initialArtifact = updatedArtifact;
            }
          }
        }

        // Handle new artifacts within this turn
        const newArtifacts = parseArtifacts(truncatedResponse);
        newArtifacts.forEach(newArtifactData => {
          // Find if this artifact already exists in the session (by ID or Title+Type)
          const existingArtifact = currentArtifacts.find(a => 
            (newArtifactData.id && a.id === newArtifactData.id) || 
            (!newArtifactData.id && a.title === newArtifactData.title && a.type === newArtifactData.type)
          );

          if (existingArtifact) {
            // Update existing artifact (new version)
            const updatedArtifact: Artifact = {
              ...existingArtifact,
              id: generateId(),
              content: newArtifactData.content,
              version: existingArtifact.version + 1,
              timestamp: Date.now()
            };
            addArtifact(updatedArtifact, sessionId);
            currentArtifacts.push(updatedArtifact);
            initialArtifact = updatedArtifact; // Update for verification
          } else {
            // Create new artifact
            const newArtifact: Artifact = {
              id: generateId(),
              type: newArtifactData.type as any,
              title: newArtifactData.title,
              content: newArtifactData.content,
              version: 1,
              timestamp: Date.now()
            };
            addArtifact(newArtifact, sessionId);
            currentArtifacts.push(newArtifact);
            initialArtifact = newArtifact; // Update for verification
          }
        });

        // Check for the specific completion signal for Multi-Chapter Mode
        // It must be the full phrase to prevent false positives from intermediate steps
        if (fullResponse.toUpperCase().includes('COMPLETED: ALL CHAPTERS HAVE BEEN GENERATED')) {
          hasCompletedSignal = true;
          console.log('COMPLETED signal detected. Ending multi-turn loop after processing.');
          break;
        }

        if (needsNextTurn) {
          // Update active skills in session if any were invoked
          if (invokedSkills.length > 0) {
            const newActiveSkills = [...new Set([...sessionActiveSkills, ...invokedSkills.map(s => s.name)])];
            updateSession({ activeSkills: newActiveSkills }, sessionId);
            sessionActiveSkills = newActiveSkills;
          }

          // If ONLY skills were invoked (no MCP calls), we don't need a next turn 
          // because the model already continued its response in the same turn
          if (executedMcpCalls.length === 0 && invokedSkills.length > 0 && !contextSettings.includeMultiChapter) {
            // We still need to update the history with the assistant message
            // but we don't 'continue' the loop
            break;
          }

          // For multi-chapter mode, we want to provide the current Glossary and Summary for context
          const glossary = currentArtifacts.find(a => a.title === 'Glossary');
          const summary = currentArtifacts.find(a => a.title === 'Cumulative Summary');
          let contextInfo = '';
          if (glossary) contextInfo += `\n\nCURRENT GLOSSARY:\n${glossary.content}`;
          if (summary) contextInfo += `\n\nCURRENT CUMULATIVE SUMMARY:\n${summary.content}`;

          const resultsPrompt = executedMcpCalls.length > 0 
            ? executedMcpCalls.map(c => 
                `<response>\n${JSON.stringify(c.response, null, 2)}\n</response>`
              ).join('\n\n')
            : (contextSettings.includeMultiChapter && !hasCompletedSignal 
                ? `Please generate the next chapter according to the Table of Contents. Remember to generate ONLY ONE chapter and then stop.${contextInfo}`
                : "The requested skills have been added to your context. Please continue your task and generate the requested output.");
          
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

          // Re-calculate context for the next turn
          const updatedActiveSkills = skills.filter(s => sessionActiveSkills.includes(s.id));
          const updatedActiveMCPs = mcpConfigs.filter(c => sessionActiveMcpIds.includes(c.id));
          
          const nextSkillsContext = updatedActiveSkills.length > 0 
            ? updatedActiveSkills.map(s => `SKILL: ${s.name}\n${s.content}`).join('\n\n') + `\n${skillReportingInstruction}`
            : '';
          const nextMcpContext = isAutoSelect 
            ? `AUTO-SELECT MCP ENABLED: You have access to all MCP servers.\nIMPORTANT: You MUST ONLY use the MCP servers and tools explicitly listed below.\nAvailable MCPs:\n${mcpConfigs.map(c => `Server: ${c.name}`).join('\n')}`
            : (updatedActiveMCPs.length > 0 ? `ACTIVE MCP SERVERS:\n${updatedActiveMCPs.map(c => `Server: ${c.name}`).join('\n')}` : '');

          currentPrompt = `${nextSkillsContext}\n\n${nextMcpContext}\n\n${resultsPrompt}`;
          
          turnCount++;
          continue;
        } else if (contextSettings.includeMultiChapter && !hasCompletedSignal) {
          // Force next turn for multi-chapter mode if not completed
          const chapters = currentArtifacts.filter(a => {
            const title = a.title.toLowerCase();
            const isToc = title.includes('table of contents') || title.includes('оглавление') || title.includes('содержание') || title === 'toc';
            const isFinal = title.includes('final document') || title.includes('assembled document') || title.includes('итоговый документ');
            const isSystem = a.id === 'workspace-explorer' || a.id === 'streaming';
            const isContext = title === 'glossary' || title === 'cumulative summary';
            return !isToc && !isFinal && !isSystem && !isContext && (title.includes('chapter') || title.includes('глава'));
          });
          const nextChapterNum = chapters.length + 1;

          // For multi-chapter mode, we want to provide the current Glossary and Summary for context
          const glossary = currentArtifacts.find(a => a.title === 'Glossary');
          const summary = currentArtifacts.find(a => a.title === 'Cumulative Summary');
          let contextInfo = '';
          if (glossary) contextInfo += `\n\nCURRENT GLOSSARY:\n${glossary.content}`;
          if (summary) contextInfo += `\n\nCURRENT CUMULATIVE SUMMARY:\n${summary.content}`;

          const resultsPrompt = `Please generate Chapter ${nextChapterNum} according to the Table of Contents. Remember to generate ONLY ONE chapter and then stop.${contextInfo}`;
          
          const resultsMessage: Message = {
            id: generateId(),
            role: 'user',
            content: resultsPrompt,
            isSystemGenerated: true,
            timestamp: Date.now()
          };
          
          addMessage(resultsMessage, sessionId);
          currentMessages.push(resultsMessage);
          currentPrompt = resultsPrompt;
          
          turnCount++;
          continue;
        } else {
          break;
        }
      }

      // Trigger verification if there are active testers and an artifact exists
      const activeTesters = skills.filter(s => currentSession?.testerSkillIds?.includes(s.id));
      if (activeTesters.length > 0 && initialArtifact) {
        // Add a temporary "Verification in progress" message
        const progressMessageId = generateId();
        const progressMessage: Message = {
          id: progressMessageId,
          role: 'system',
          content: `🔍 Verification in progress by ${activeTesters.map(t => t.name).join(', ')}...`,
          timestamp: Date.now(),
          isSystemGenerated: true
        };
        addMessage(progressMessage, sessionId);

        try {
          const report = await verifyArtifact(initialArtifact, activeTesters, geminiApiKey, geminiModel);
          
          // Remove the progress message and add the report
          removeMessage(progressMessageId, sessionId);
          
          if (report) {
            const verificationMessage: Message = {
              id: generateId(),
              role: 'system',
              content: `Verification report from ${report.testerName}`,
              timestamp: Date.now(),
              verificationReport: report
            };
            addMessage(verificationMessage, sessionId);
          }
        } catch (error) {
          console.error('Verification failed:', error);
          // Remove progress message on error
          removeMessage(progressMessageId, sessionId);
        }
      }

      if (initialMessages.length === 0) {
        updateSession({ title: content.substring(0, 30) + (content.length > 30 ? '...' : '') }, sessionId);
      }

      // Auto-assemble if completed signal was detected in any turn
      if (hasCompletedSignal) {
        // Use a slightly longer timeout to ensure state updates have propagated
        setTimeout(() => {
          handleAssembleProject(sessionId);
        }, 1000);
      }

    } catch (error: any) {
      console.error('Streaming error:', error);
      let errorMessage = 'Sorry, I encountered an error while processing your request.';
      
      // Handle Gemini Quota Error
      if (error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED')) {
        errorMessage = '⚠️ **Gemini API Quota Exceeded.**\n\nYour API key has reached its rate limit or daily quota. \n\n**What to do:**\n1. Wait a minute and try again.\n2. Check your usage at [Google AI Studio](https://aistudio.google.com/).\n3. Ensure your billing is set up if you are using a paid plan.';
      } else if (error?.message?.includes('API_KEY_INVALID')) {
        errorMessage = '❌ **Invalid API Key.**\n\nPlease check the Gemini API key you entered in the settings (gear icon next to Gemini provider).';
      }

      addMessage({
        id: generateId(),
        role: 'assistant',
        content: errorMessage,
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

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  };

  const currentArtifact = currentSession?.artifacts.find(a => a.id === currentSession.currentArtifactId) || null;
  const currentIndex = currentSession?.artifacts.findIndex(a => a.id === currentSession.currentArtifactId) ?? -1;

  const workspaceArtifact: Artifact = {
    id: 'workspace-explorer',
    type: 'markdown',
    title: 'Workspace Explorer',
    content: 'No artifact selected.',
    files: [],
    version: 1,
    timestamp: Date.now()
  };

  const displayArtifact = isStreaming && streamingArtifact ? {
    id: 'streaming',
    ...streamingArtifact,
    version: currentArtifact ? currentArtifact.version : 1,
    timestamp: Date.now()
  } as Artifact : (currentArtifact || (currentSession?.artifacts.length ? currentSession.artifacts[currentSession.artifacts.length - 1] : workspaceArtifact));

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
        folders={folders}
        currentSessionId={currentSessionId}
        onSessionSelect={setCurrentSessionId}
        onNewSession={createSession}
        onDeleteSession={handleDeleteSession}
        onMoveSession={handleMoveSessionToFolder}
        onCreateFolder={createFolder}
        onUpdateFolder={handleUpdateFolder}
        onDeleteFolder={handleDeleteFolder}
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
            testerSkillIds={currentSession?.testerSkillIds || []}
            onToggleTester={handleToggleTester}
            autoSelectSkills={currentSession?.autoSelectSkills || false}
          />
        )}
        {activeTab === 'mcp' && (
          <MCPPanel 
            configs={mcpConfigs}
            onAddConfig={handleAddMCP}
            onUpdateConfig={handleUpdateMCP}
            onDeleteConfig={handleDeleteMCP}
            activeMcpIds={currentSession?.activeMcpIds || []}
            onToggleMcp={handleToggleMcp}
            autoSelectSkills={currentSession?.autoSelectSkills || false}
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
            onStop={handleStop}
            isStreaming={isStreaming}
            streamingText={streamingText}
            provider={provider}
            onProviderChange={setProvider}
            ollamaConfig={ollamaConfig}
            onOllamaConfigChange={handleOllamaConfigChange}
            availableModels={availableModels}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            isSidebarOpen={isSidebarOpen}
            skills={skills}
            activeSkillIds={currentSession?.activeSkills || []}
            testerSkillIds={currentSession?.testerSkillIds || []}
            onToggleSkill={handleToggleSkill}
            onToggleTester={handleToggleTester}
            mcpConfigs={mcpConfigs}
            activeMcpIds={currentSession?.activeMcpIds || []}
            onToggleMcp={handleToggleMcp}
            autoSelectSkills={currentSession?.autoSelectSkills || false}
            onToggleAutoSelect={handleToggleAutoSelect}
            geminiApiKey={geminiApiKey}
            onGeminiApiKeyChange={setGeminiApiKey}
            geminiModel={geminiModel}
            onGeminiModelChange={setGeminiModel}
            webSearchEnabled={webSearchEnabled}
            onToggleWebSearch={() => setWebSearchEnabled(!webSearchEnabled)}
            contextSettings={contextSettings}
            onContextSettingsChange={setContextSettings}
            onApplyVerificationFixes={handleApplyVerificationFixes}
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
            geminiApiKey={geminiApiKey}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            isSidebarOpen={isSidebarOpen}
            workspaceHandle={workspaceHandle}
            workspaceTree={workspaceTree}
            onRefreshTree={() => updateWorkspaceTree(workspaceHandle)}
            onDisconnectWorkspace={handleDisconnectWorkspace}
            selectedFilePath={currentSession?.selectedFilePath || null}
            onFileSelect={(path) => updateSession({ selectedFilePath: path })}
            sessionId={currentSession?.id}
            folderName={folders.find(f => f.id === currentSession?.folderId)?.name}
            streamingText={streamingText}
            onUpdateArtifact={(updates) => displayArtifact && displayArtifact.id !== 'workspace-explorer' && displayArtifact.id !== 'streaming' && updateArtifact(displayArtifact.id, updates)}
            contextLogs={currentSession?.contextLogs || []}
            project={projects.find(p => p.id === currentSession?.activeProjectId)}
            includeMultiChapter={contextSettings.includeMultiChapter}
            targetDepth={contextSettings.targetDepth}
            onAssemble={() => handleAssembleProject(currentSession?.id || undefined)}
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

  {/* ProjectConfigurator removed */}
</div>
);
}

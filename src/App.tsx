/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatPanel } from './components/ChatPanel';
import { ArtifactPanel } from './components/ArtifactPanel';
import { useSessions } from './hooks/useSession';
import { streamResponse, fetchOllamaModels } from './engines/streamEngine';
import { parseArtifact, parsePatches, applyPatches, stripArtifactsAndPatches } from './engines/patchEngine';
import { Message, Attachment, Artifact, OllamaConfig } from './types';
import { generateId } from './utils';
import { motion, AnimatePresence } from 'motion/react';
import { Layers, Diff } from 'lucide-react';

export default function App() {
  const {
    sessions,
    currentSession,
    setCurrentSessionId,
    createSession,
    updateSession,
    deleteSession,
    addMessage,
    addArtifact
  } = useSessions();

  const [provider, setProvider] = useState<'gemini' | 'ollama'>(() => {
    const saved = localStorage.getItem('ai_provider');
    console.log('Initial AI Provider from localStorage:', saved);
    return (saved as 'gemini' | 'ollama') || 'gemini';
  });

  useEffect(() => {
    console.log('Saving AI Provider to localStorage:', provider);
    localStorage.setItem('ai_provider', provider);
  }, [provider]);

  const [ollamaConfig, setOllamaConfig] = useState<OllamaConfig>(() => {
    const saved = localStorage.getItem('ollama_config');
    return saved ? JSON.parse(saved) : {
      baseUrl: 'http://localhost:11434',
      selectedModel: 'llama3'
    };
  });

  useEffect(() => {
    localStorage.setItem('ollama_config', JSON.stringify(ollamaConfig));
  }, [ollamaConfig]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [availableModels, setAvailableModels] = useState<string[]>(() => {
    const saved = localStorage.getItem('ollama_config');
    const config = saved ? JSON.parse(saved) : null;
    const defaultModels = ['llama3'];
    if (config?.selectedModel && !defaultModels.includes(config.selectedModel)) {
      return [...defaultModels, config.selectedModel];
    }
    return defaultModels;
  });

  // Sync state across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'ai_provider' && e.newValue) {
        console.log('AI Provider synced from another tab:', e.newValue);
        setProvider(e.newValue as any);
      }
      if (e.key === 'ollama_config' && e.newValue) {
        const newConfig = JSON.parse(e.newValue);
        setOllamaConfig(newConfig);
        // Ensure the selected model is in the list
        setAvailableModels(prev => {
          if (!prev.includes(newConfig.selectedModel)) {
            return [...prev, newConfig.selectedModel];
          }
          return prev;
        });
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [streamingArtifact, setStreamingArtifact] = useState<{ type: string; title: string; content: string } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch models when provider is ollama or baseUrl changes
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

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content,
      attachments,
      timestamp: Date.now()
    };

    addMessage(userMessage);
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

          // Extract partial artifact for live preview
          const partialArtifact = parseArtifact(fullResponse);
          if (partialArtifact) {
            setStreamingArtifact(partialArtifact as any);
          }
        }
      }

      // Process the final response
      const patches = parsePatches(fullResponse);
      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: stripArtifactsAndPatches(fullResponse),
        timestamp: Date.now(),
        patches: patches.length > 0 ? patches : undefined
      };
      addMessage(assistantMessage);

      // Check for new artifact
      const newArtifactData = parseArtifact(fullResponse);
      if (newArtifactData) {
        const newArtifact: Artifact = {
          id: generateId(),
          type: newArtifactData.type as any,
          title: newArtifactData.title,
          content: newArtifactData.content,
          version: 1,
          timestamp: Date.now()
        };
        addArtifact(newArtifact);
      } else if (currentArtifact) {
        // Check for patches
        const patches = parsePatches(fullResponse);
        if (patches.length > 0) {
          const { content: patchedContent, successCount } = applyPatches(currentArtifact.content, patches);
          if (successCount > 0) {
            const updatedArtifact: Artifact = {
              ...currentArtifact,
              id: generateId(), // New ID for version history
              content: patchedContent,
              version: currentArtifact.version + 1,
              timestamp: Date.now()
            };
            addArtifact(updatedArtifact);
            // Optional: toast successCount
          }
        }
      }

      // Update session title if it's the first message
      if (messages.length === 1) {
        updateSession({ title: content.substring(0, 30) + (content.length > 30 ? '...' : '') });
      }

    } catch (error) {
      console.error('Streaming error:', error);
      addMessage({
        id: generateId(),
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your request.',
        timestamp: Date.now()
      });
    } finally {
      setIsStreaming(false);
      setStreamingText('');
      setStreamingArtifact(null);
      abortControllerRef.current = null;
    }
  }, [currentSession, addMessage, addArtifact, updateSession, provider, ollamaConfig]);

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

  const displayArtifact = isStreaming && streamingArtifact ? {
    id: 'streaming',
    ...streamingArtifact,
    version: currentArtifact ? currentArtifact.version : 1,
    timestamp: Date.now()
  } as Artifact : currentArtifact;

  return (
    <div className="flex h-screen w-full bg-zinc-100 font-sans text-zinc-900 overflow-hidden relative">
      <Sidebar 
        sessions={sessions}
        currentSessionId={currentSession?.id || null}
        onSessionSelect={setCurrentSessionId}
        onNewSession={createSession}
        onDeleteSession={deleteSession}
        provider={provider}
        onProviderChange={setProvider}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      <main className="flex-1 flex overflow-hidden relative">
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

        <div className="flex-1 flex flex-col min-w-0 relative">
          <ArtifactPanel 
            artifact={displayArtifact}
            history={currentSession?.artifacts || []}
            onVersionSelect={handleVersionSelect}
            currentIndex={currentIndex}
            onSave={handleSaveArtifact}
            isStreaming={isStreaming}
          />
          
          {/* Overlay for streaming artifact */}
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
      </main>
    </div>
  );
}

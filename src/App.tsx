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
import { Layers } from 'lucide-react';

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

  const [provider, setProvider] = useState<'gemini' | 'ollama'>('gemini');
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
  const [availableModels, setAvailableModels] = useState<string[]>(['llama3']);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch models when provider is ollama or baseUrl changes
  useEffect(() => {
    if (provider === 'ollama') {
      fetchOllamaModels(ollamaConfig.baseUrl).then(setAvailableModels);
    }
  }, [provider, ollamaConfig.baseUrl]);

  const handleOllamaConfigChange = (updates: Partial<OllamaConfig>) => {
    setOllamaConfig(prev => ({ ...prev, ...updates }));
  };

  const handleSendMessage = useCallback(async (content: string, attachments: Attachment[]) => {
    if (!currentSession) {
      // Session will be created automatically by addMessage if not exists
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

    const currentArtifact = currentSession?.artifacts[currentSession.artifacts.length - 1];
    const messages = [...(currentSession?.messages || []), userMessage];

    try {
      let fullResponse = '';
      const stream = streamResponse(
        provider,
        messages,
        { baseUrl: ollamaConfig.baseUrl, model: ollamaConfig.selectedModel },
        currentArtifact?.content,
        (controller) => { abortControllerRef.current = controller; }
      );

      for await (const chunk of stream) {
        if (chunk.text) {
          fullResponse = chunk.fullText;
          setStreamingText(fullResponse);
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
            artifact={currentArtifact}
            history={currentSession?.artifacts || []}
            onVersionSelect={handleVersionSelect}
            currentIndex={currentIndex}
            onSave={handleSaveArtifact}
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
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

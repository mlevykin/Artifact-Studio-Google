import { useState, useEffect, useRef } from 'react';
import { Session, Message, Artifact, Attachment } from '../types';
import { generateId } from '../utils';

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const currentSession = sessions.find(s => s.id === currentSessionId) || null;
  const currentSessionRef = useRef(currentSessionId);

  useEffect(() => {
    currentSessionRef.current = currentSessionId;
  }, [currentSessionId]);

  const createSession = () => {
    const newSession: Session = {
      id: generateId(),
      title: 'New Chat',
      messages: [],
      artifacts: [],
      currentArtifactId: null,
      lastUpdated: Date.now(),
      activeSkills: [],
      selectedFilePath: null
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    return newSession;
  };

  const updateSession = (updates: Partial<Session>, sessionId?: string) => {
    const targetId = sessionId || currentSessionRef.current;
    if (!targetId) return;
    setSessions(prev => prev.map(s => 
      s.id === targetId ? { ...s, ...updates, lastUpdated: Date.now() } : s
    ));
  };

  const deleteSession = (id: string) => {
    setSessions(prev => {
      const remaining = prev.filter(s => s.id !== id);
      if (currentSessionRef.current === id) {
        setCurrentSessionId(remaining.length > 0 ? remaining[0].id : null);
      }
      return remaining;
    });
  };

  const addMessage = (message: Message, sessionId?: string) => {
    const targetId = sessionId || currentSessionRef.current;
    if (!targetId) return;
    setSessions(prev => prev.map(s => 
      s.id === targetId 
        ? { ...s, messages: [...s.messages, message], lastUpdated: Date.now() } 
        : s
    ));
  };

  const addArtifact = (artifact: Artifact, sessionId?: string) => {
    const targetId = sessionId || currentSessionRef.current;
    if (!targetId) return;
    setSessions(prev => prev.map(s => 
      s.id === targetId 
        ? { ...s, artifacts: [...s.artifacts, artifact], currentArtifactId: artifact.id, lastUpdated: Date.now() } 
        : s
    ));
  };

  const updateMessage = (messageId: string, updates: Partial<Message>, sessionId?: string) => {
    const targetId = sessionId || currentSessionRef.current;
    if (!targetId) return;
    setSessions(prev => prev.map(s => 
      s.id === targetId 
        ? { ...s, messages: s.messages.map(m => m.id === messageId ? { ...m, ...updates } : m), lastUpdated: Date.now() } 
        : s
    ));
  };

  const removeMessage = (messageId: string, sessionId?: string) => {
    const targetId = sessionId || currentSessionRef.current;
    if (!targetId) return;
    setSessions(prev => prev.map(s => 
      s.id === targetId 
        ? { ...s, messages: s.messages.filter(m => m.id !== messageId), lastUpdated: Date.now() } 
        : s
    ));
  };

  return {
    sessions,
    currentSession,
    currentSessionId,
    setCurrentSessionId,
    createSession,
    updateSession,
    deleteSession,
    addMessage,
    addArtifact,
    updateMessage,
    removeMessage,
    setSessions
  };
}

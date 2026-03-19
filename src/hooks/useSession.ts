import { useState, useEffect } from 'react';
import { Session, Message, Artifact, Attachment } from '../types';
import { generateId } from '../utils';

const STORAGE_KEY = 'artifact_studio_sessions';

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse sessions', e);
      }
    }
    return [];
  });

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.length > 0 ? parsed[0].id : null;
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // Save to localStorage (stripping images to save space)
  useEffect(() => {
    const sessionsToSave = sessions.map(s => ({
      ...s,
      messages: s.messages.map(m => ({
        ...m,
        attachments: m.attachments?.map(a => ({
          ...a,
          data: a.type === 'image' ? '' : a.data // Strip image data
        }))
      }))
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionsToSave));
  }, [sessions]);

  const currentSession = sessions.find(s => s.id === currentSessionId) || null;

  const createSession = () => {
    const newSession: Session = {
      id: generateId(),
      title: 'New Chat',
      messages: [],
      artifacts: [],
      currentArtifactId: null,
      lastUpdated: Date.now()
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    return newSession;
  };

  const updateSession = (updates: Partial<Session>) => {
    if (!currentSessionId) return;
    setSessions(prev => prev.map(s => 
      s.id === currentSessionId ? { ...s, ...updates, lastUpdated: Date.now() } : s
    ));
  };

  const deleteSession = (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    if (currentSessionId === id) {
      setCurrentSessionId(prev => {
        const remaining = sessions.filter(s => s.id !== id);
        return remaining.length > 0 ? remaining[0].id : null;
      });
    }
  };

  const addMessage = (message: Message) => {
    if (!currentSessionId) return;
    updateSession({
      messages: [...(currentSession?.messages || []), message]
    });
  };

  const addArtifact = (artifact: Artifact) => {
    if (!currentSessionId) return;
    updateSession({
      artifacts: [...(currentSession?.artifacts || []), artifact],
      currentArtifactId: artifact.id
    });
  };

  return {
    sessions,
    currentSession,
    setCurrentSessionId,
    createSession,
    updateSession,
    deleteSession,
    addMessage,
    addArtifact
  };
}

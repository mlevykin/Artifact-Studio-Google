import { useState, useEffect } from 'react';
import { Session, Message, Artifact, Attachment } from '../types';
import { generateId } from '../utils';

const STORAGE_KEY = 'artifact_studio_sessions';

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSessions(parsed);
        if (parsed.length > 0) {
          setCurrentSessionId(parsed[0].id);
        }
      } catch (e) {
        console.error('Failed to parse sessions', e);
      }
    }
  }, []);

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
    setSessions([newSession, ...sessions]);
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
      setCurrentSessionId(sessions.find(s => s.id !== id)?.id || null);
    }
  };

  const addMessage = (message: Message) => {
    if (!currentSessionId) {
      const session = createSession();
      setSessions(prev => prev.map(s => 
        s.id === session.id ? { ...s, messages: [message] } : s
      ));
    } else {
      updateSession({
        messages: [...(currentSession?.messages || []), message]
      });
    }
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

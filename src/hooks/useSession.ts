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
    const savedId = localStorage.getItem('artifact_studio_current_session_id');
    if (savedId) return savedId;

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

  // Save current session ID to localStorage
  useEffect(() => {
    if (currentSessionId) {
      localStorage.setItem('artifact_studio_current_session_id', currentSessionId);
    } else {
      localStorage.removeItem('artifact_studio_current_session_id');
    }
  }, [currentSessionId]);

  // Save to localStorage (stripping images to save space and privacy)
  useEffect(() => {
    const sessionsToSave = sessions.map(s => ({
      ...s,
      messages: s.messages.map(m => ({
        ...m,
        attachments: m.attachments?.filter(a => a.type !== 'image')
      }))
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionsToSave));
  }, [sessions]);

  // Sync sessions across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const newSessions = JSON.parse(e.newValue);
          setSessions(newSessions);
        } catch (err) {
          console.error('Failed to sync sessions', err);
        }
      }
      if (e.key === 'artifact_studio_current_session_id') {
        setCurrentSessionId(e.newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const currentSession = sessions.find(s => s.id === currentSessionId) || null;

  const createSession = () => {
    const newSession: Session = {
      id: generateId(),
      title: 'New Chat',
      messages: [],
      artifacts: [],
      currentArtifactId: null,
      lastUpdated: Date.now(),
      activeSkills: []
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
    setSessions(prev => prev.map(s => 
      s.id === currentSessionId 
        ? { ...s, messages: [...s.messages, message], lastUpdated: Date.now() } 
        : s
    ));
  };

  const addArtifact = (artifact: Artifact) => {
    if (!currentSessionId) return;
    setSessions(prev => prev.map(s => 
      s.id === currentSessionId 
        ? { ...s, artifacts: [...s.artifacts, artifact], currentArtifactId: artifact.id, lastUpdated: Date.now() } 
        : s
    ));
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

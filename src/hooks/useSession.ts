import { useState, useEffect, useRef } from 'react';
import { Session, Message, Artifact, Attachment, ContextLogEntry, ChatFolder } from '../types';
import { generateId } from '../utils';

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [folders, setFolders] = useState<ChatFolder[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const currentSession = sessions.find(s => s.id === currentSessionId) || null;
  const currentSessionRef = useRef(currentSessionId);

  useEffect(() => {
    currentSessionRef.current = currentSessionId;
  }, [currentSessionId]);

  const createSession = (folderId?: string | null) => {
    const newSession: Session = {
      id: generateId(),
      title: 'New Chat',
      messages: [],
      artifacts: [],
      currentArtifactId: null,
      lastUpdated: Date.now(),
      activeSkills: [],
      selectedFilePath: null,
      contextLogs: [],
      folderId: folderId || null
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    return newSession;
  };

  const createFolder = (name: string) => {
    const newFolder: ChatFolder = {
      id: generateId(),
      name,
      isExpanded: true,
      lastUpdated: Date.now()
    };
    setFolders(prev => [newFolder, ...prev]);
    return newFolder;
  };

  const updateFolder = (id: string, updates: Partial<ChatFolder>) => {
    setFolders(prev => prev.map(f => 
      f.id === id ? { ...f, ...updates, lastUpdated: Date.now() } : f
    ));
  };

  const deleteFolder = (id: string) => {
    setFolders(prev => prev.filter(f => f.id !== id));
    // Move sessions from this folder to root
    setSessions(prev => prev.map(s => 
      s.folderId === id ? { ...s, folderId: null, lastUpdated: Date.now() } : s
    ));
  };

  const addContextLog = (log: ContextLogEntry, sessionId?: string) => {
    const targetId = sessionId || currentSessionRef.current;
    if (!targetId) return;
    setSessions(prev => prev.map(s => 
      s.id === targetId 
        ? { ...s, contextLogs: [...(s.contextLogs || []), log], lastUpdated: Date.now() } 
        : s
    ));
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

  const updateArtifact = (artifactId: string, updates: Partial<Artifact>, sessionId?: string) => {
    const targetId = sessionId || currentSessionRef.current;
    if (!targetId) return;
    setSessions(prev => prev.map(s => 
      s.id === targetId 
        ? { ...s, artifacts: s.artifacts.map(a => a.id === artifactId ? { ...a, ...updates } : a), lastUpdated: Date.now() } 
        : s
    ));
  };

  return {
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
  };
}

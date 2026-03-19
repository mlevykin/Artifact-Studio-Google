export type ArtifactType = 'mermaid' | 'html' | 'markdown' | 'svg' | 'text';

export interface Artifact {
  id: string;
  type: ArtifactType;
  title: string;
  content: string;
  version: number;
  timestamp: number;
}

export interface ArtifactVersion {
  content: string;
  meta: string; // e.g., "new" or "patch (3)"
  timestamp: number;
}

export interface Attachment {
  id: string;
  type: 'image' | 'text';
  name: string;
  data: string; // base64 for images, plaintext for text
  mimeType: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: Attachment[];
  timestamp: number;
}

export interface Session {
  id: string;
  title: string;
  messages: Message[];
  artifacts: Artifact[]; // History of artifacts in this session
  currentArtifactId: string | null;
  lastUpdated: number;
}

export interface Patch {
  old: string;
  new: string;
}

export interface OllamaConfig {
  baseUrl: string;
  selectedModel: string;
}

export interface Settings {
  provider: 'gemini' | 'ollama';
  ollama: OllamaConfig;
  mermaidTheme: 'default' | 'dark' | 'forest' | 'neutral';
  language: 'en' | 'ru';
}

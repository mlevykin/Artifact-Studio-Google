export type ArtifactType = 'mermaid' | 'html' | 'markdown' | 'svg' | 'text' | 'project';

export interface ProjectFile {
  id: string;
  name: string;
  path: string; // e.g., "src/App.tsx"
  content: string;
  type: ArtifactType;
}

export interface Artifact {
  id: string;
  type: ArtifactType;
  title: string;
  content: string;
  files?: ProjectFile[]; // For multi-file artifacts
  version: number;
  timestamp: number;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  content: string; // Markdown content describing the skill
  path: string; // Folder structure (e.g., "Testing/QA")
  enabled: boolean;
}

export interface MCPConfig {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  authType?: 'none' | 'apiKey' | 'oauth2';
  apiKey?: string;
  oauthConfig?: {
    clientId: string;
    clientSecret: string;
    authUrl: string;
    tokenUrl: string;
    scope: string;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
  };
  status?: 'connected' | 'error' | 'disconnected';
  error?: string;
  tools?: {
    name: string;
    description?: string;
    inputSchema?: any;
  }[];
}

export interface Attachment {
  id: string;
  type: 'image' | 'text';
  name: string;
  data: string; // Base64 for images, raw text for files
  mimeType: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: Attachment[];
  timestamp: number;
  patches?: Patch[];
  thought?: string; // For reasoning/planning
  isSystemGenerated?: boolean; // If true, hide from chat UI but keep in context
  invokedSkills?: {
    name: string;
    description?: string;
  }[];
  mcpCalls?: {
    name: string;
    description?: string;
    request: any;
    response: any;
  }[];
}

export interface Session {
  id: string;
  title: string;
  messages: Message[];
  artifacts: Artifact[]; // History of artifacts in this session
  currentArtifactId: string | null;
  lastUpdated: number;
  activeSkills?: string[]; // IDs of enabled skills for this session
  activeMcpIds?: string[]; // IDs of enabled MCPs for this session
  autoSelectSkills?: boolean; // Whether AI should auto-select skills/MCPs
  selectedFilePath?: string | null; // Currently selected file in the workspace
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
  mcpConfigs: MCPConfig[];
}

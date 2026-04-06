export type ArtifactType = 'mermaid' | 'html' | 'markdown' | 'svg' | 'text';

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
  mermaidStyleId?: string; // For per-artifact style persistence
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  content: string; // Markdown content describing the skill
  path: string; // Folder structure (e.g., "Testing/QA")
  enabled: boolean;
  role?: 'default' | 'tester';
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

export interface MessageStep {
  type: 'thought' | 'skill' | 'mcp' | 'text';
  content?: string;
  name?: string;
  description?: string;
  request?: any;
  response?: any;
}

export interface VerificationReport {
  testerName: string;
  isValid: boolean;
  issues: string[];
  suggestedPatches: Patch[];
  status: 'pending' | 'applied' | 'rejected';
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
  steps?: MessageStep[]; // For ordered rendering of thoughts, skills, and text
  verificationReport?: VerificationReport;
}

export interface ContextLogEntry {
  id: string;
  timestamp: number;
  request: {
    model: string;
    systemInstruction?: string;
    contents: any;
    tools?: any;
    config?: any;
  };
  response: {
    text?: string;
    functionCalls?: any;
    usageMetadata?: {
      promptTokenCount: number;
      candidatesTokenCount: number;
      totalTokenCount: number;
    };
    raw?: any;
  };
}

export interface ProjectConfig {
  id: string;
  name: string;
  description: string;
  targetDepth: number; // 1-5 (granularity)
  tone: string;
  audience: string;
  rootFolder: string;
  status: 'planning' | 'generating' | 'completed' | 'idle';
  currentChapter?: number;
  totalChapters?: number;
  blueprint?: {
    toc: string[];
    glossary: Record<string, string>;
    styleGuide: string;
  };
  summary?: string; // Cumulative summary
  knowledgeGraph?: string; // Compressed knowledge graph
}

export interface ChatFolder {
  id: string;
  name: string;
  isExpanded: boolean;
  lastUpdated: number;
}

export interface Session {
  id: string;
  name?: string; // Optional name for the session
  title: string;
  messages: Message[];
  artifacts: Artifact[]; // History of artifacts in this session
  currentArtifactId: string | null;
  lastUpdated: number;
  activeSkills?: string[]; // IDs of enabled skills for this session
  invokedSkillIds?: string[]; // IDs of skills invoked by the model
  testerSkillIds?: string[]; // IDs of skills acting as testers for this session
  activeMcpIds?: string[]; // IDs of enabled MCPs for this session
  invokedMcpIds?: string[]; // IDs of MCPs invoked by the model
  autoSelectSkills?: boolean; // Whether AI should auto-select skills/MCPs
  selectedFilePath?: string | null; // Currently selected file in the workspace
  contextLogs?: ContextLogEntry[];
  activeProjectId?: string | null; // Currently active project for multi-chapter generation
  folderId?: string | null; // ID of the folder this session belongs to
}

export interface Patch {
  old: string;
  new: string;
  artifactId?: string;
  title?: string;
}

export interface OllamaConfig {
  baseUrl: string;
  selectedModel: string;
}

export interface ContextSettings {
  includeSystemPrompt: boolean;
  includeChatHistory: boolean;
  includeAttachmentsHistory: boolean;
  includeArtifactContext: boolean;
  includeSkills: boolean;
  includeMcp: boolean;
  includeMultiChapter: boolean;
  targetDepth: number;
}

export interface Settings {
  provider: 'gemini' | 'ollama';
  ollama: OllamaConfig;
  mermaidTheme: 'default' | 'dark' | 'forest' | 'neutral';
  language: 'en' | 'ru';
  mcpConfigs: MCPConfig[];
}

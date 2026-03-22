import React, { useState, useRef, useEffect } from 'react';
import { 
  Code, 
  Eye, 
  Download, 
  History, 
  Maximize2, 
  ChevronLeft, 
  ChevronRight,
  Copy,
  Check,
  Edit,
  Save,
  X,
  FolderSync,
  RefreshCw
} from 'lucide-react';
import { 
  parseArtifacts, 
  parsePartialArtifact, 
  parsePartialPatches 
} from '../engines/patchEngine';
import { Artifact, ProjectFile } from '../types';
import { cn } from '../utils';
import { MermaidPreview } from './MermaidPreview';
import { HtmlPreview } from './HtmlPreview';
import { ZoomableContainer } from './ZoomableContainer';
import { FileExplorer } from './FileExplorer';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import html2canvas from 'html2canvas';
import { selectLocalDirectory, checkPermission, requestPermission, writeProjectToDirectory, readFileFromDirectory } from '../services/fileSystemService';

interface ArtifactPanelProps {
  artifact: Artifact | null;
  history: Artifact[];
  onVersionSelect: (index: number) => void;
  currentIndex: number;
  onSave: (content: string, fileId?: string) => void;
  isStreaming?: boolean;
  streamingText?: string;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
  workspaceHandle?: any | null;
  workspaceTree?: any | null;
  onRefreshTree?: () => void;
  onDisconnectWorkspace?: () => void;
  selectedFilePath: string | null;
  onFileSelect: (path: string) => void;
  sessionId?: string | null;
}

export const ArtifactPanel: React.FC<ArtifactPanelProps> = ({ 
  artifact, 
  history, 
  onVersionSelect,
  currentIndex,
  onSave,
  isStreaming = false,
  streamingText = '',
  onToggleSidebar,
  isSidebarOpen = true,
  workspaceHandle = null,
  workspaceTree = null,
  onRefreshTree,
  onDisconnectWorkspace,
  selectedFilePath,
  onFileSelect,
  sessionId
}) => {
  const [view, setView] = useState<'preview' | 'code'>('preview');
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [copied, setCopied] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({ '': true });
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const codeAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevArtifactIdRef = useRef<string | null>(null);

  const isWorkspaceMode = artifact?.id === 'workspace-explorer';

  const currentFile = artifact?.type === 'project' && selectedFileId 
    ? artifact.files?.find(f => f.id === selectedFileId) 
    : null;

  const pContent = currentFile ? currentFile.content : (isWorkspaceMode ? editContent : artifact?.content || '');
  
  const getPreviewType = () => {
    if (currentFile) return currentFile.type;
    if (isWorkspaceMode && selectedFilePath) {
      const ext = selectedFilePath.split('.').pop()?.toLowerCase();
      if (ext === 'html') return 'html';
      if (ext === 'md' || ext === 'markdown') return 'markdown';
      if (ext === 'mmd' || ext === 'mermaid') return 'mermaid';
      if (ext === 'svg') return 'svg';
      return 'text';
    }
    if (!artifact) return 'text';
    const type = artifact.type;
    if (type === 'markdown') return 'markdown';
    return type;
  };
  const pType = getPreviewType();

  // Expand parent folders when selected file changes
  useEffect(() => {
    if (selectedFilePath) {
      const parts = selectedFilePath.split('/');
      const newExpanded = { ...expandedFolders };
      let currentPath = '';
      
      // Expand all parent directories
      for (let i = 0; i < parts.length - 1; i++) {
        currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
        newExpanded[currentPath] = true;
      }
      
      setExpandedFolders(newExpanded);
    }
  }, [selectedFilePath]);

  // Auto-sync when artifact changes if we have a workspace handle
  useEffect(() => {
    const autoSync = async () => {
      if (workspaceHandle && artifact && !isStreaming && artifact.id !== 'streaming') {
        const hasPermission = await checkPermission(workspaceHandle);
        if (hasPermission) {
          handleSyncToDisk(true); // silent sync
        }
      }
    };
    autoSync();
  }, [artifact?.version, artifact?.id, isStreaming, workspaceHandle]);

  const handleSyncToDisk = async (silent: boolean = false) => {
    try {
      if (!workspaceHandle) {
        if (!silent) alert('Пожалуйста, сначала выберите рабочую папку.');
        return;
      }

      const hasPermission = silent 
        ? await checkPermission(workspaceHandle)
        : await requestPermission(workspaceHandle);
        
      if (!hasPermission) {
        if (!silent) alert('Не удалось получить разрешение на запись в папку.');
        return;
      }

      setIsSyncing(true);
      
      let filesToSync: { path: string; content: string }[] = [];
      
      if (artifact?.type === 'project' && artifact.files) {
        filesToSync = artifact.files.map(f => {
          const path = sessionId ? `artifacts/${sessionId}/${f.path}` : f.path;
          return { path, content: f.content };
        });
      } else if (artifact) {
        // For single artifacts, save them in an 'artifacts' folder
        const ext = artifact.type === 'mermaid' ? 'mmd' : artifact.type === 'markdown' ? 'md' : artifact.type;
        const path = sessionId 
          ? `artifacts/${sessionId}/${artifact.title}.${ext}` 
          : `artifacts/${artifact.title}.${ext}`;
        filesToSync = [{ 
          path, 
          content: artifact.content 
        }];
      }

      if (filesToSync.length > 0) {
        await writeProjectToDirectory(workspaceHandle, filesToSync);
        if (onRefreshTree) {
          onRefreshTree();
        }
      }
      setIsSyncing(false);
    } catch (error) {
      console.error('Sync failed:', error);
      setIsSyncing(false);
      if (!silent) {
        alert(error instanceof Error ? error.message : 'Ошибка при синхронизации с диском.');
      }
    }
  };

  const toggleFullScreen = () => {
    if (!isFullScreen) {
      if (panelRef.current?.requestFullscreen) {
        panelRef.current.requestFullscreen();
      }
      if (isSidebarOpen && onToggleSidebar) {
        onToggleSidebar();
      }
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
    }
    setIsFullScreen(!isFullScreen);
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Switch to code view when streaming starts and an artifact/patch is detected
  const lastStreamingIdRef = useRef<string | null>(null);
  React.useEffect(() => {
    const isStreamingNew = isStreaming && streamingText.length > 0;
    const hasArtifactOrPatch = isStreamingNew && (streamingText.includes('<artifact') || streamingText.includes('<patch'));
    
    // Only auto-switch to code if we just started streaming a new artifact/patch
    if (hasArtifactOrPatch && lastStreamingIdRef.current !== artifact?.id) {
      if (view !== 'code') setView('code');
      lastStreamingIdRef.current = artifact?.id || 'streaming';
    } 
    
    // Auto-switch to code for workspace explorer
    if (artifact && artifact.id === 'workspace-explorer' && view !== 'code') {
      setView('code');
    }

  // Reset the streaming ref when streaming ends
    if (!isStreaming) {
      lastStreamingIdRef.current = null;
    }
  }, [isStreaming, streamingText, artifact?.id]);

  // Auto-switch to preview when streaming ends and we have a new artifact/version
  const lastArtifactVersionRef = useRef<number>(0);
  React.useEffect(() => {
    if (!isStreaming && artifact && artifact.id !== 'workspace-explorer') {
      const currentVersion = artifact.version;
      if (currentVersion > lastArtifactVersionRef.current) {
        // Only switch if we were in code view and it's not a workspace explorer
        if (view === 'code') {
          setView('preview');
        }
        lastArtifactVersionRef.current = currentVersion;
      }
    }
  }, [isStreaming, artifact, view]);

  // Scroll to patch location during streaming
  const lastPatchCountRef = useRef(0);
  React.useEffect(() => {
    if (!isStreaming || !streamingText.includes('<patch')) return;
    
    const patches = parsePartialPatches(streamingText);
    
    if (patches.length > lastPatchCountRef.current) {
      const latestPatch = patches[patches.length - 1];
      if (latestPatch.old && (textareaRef.current || codeAreaRef.current)) {
        const container = textareaRef.current || codeAreaRef.current;
        const content = isEditing ? editContent : pContent;
        const index = content.indexOf(latestPatch.old);
        
        if (index !== -1) {
          // Approximate line height for scrolling
          const linesBefore = content.substring(0, index).split('\n').length;
          const lineHeight = 20; // Approximate
          container?.scrollTo({
            top: (linesBefore - 5) * lineHeight,
            behavior: 'smooth'
          });
        }
      }
      lastPatchCountRef.current = patches.length;
    }

    if (!isStreaming) {
      lastPatchCountRef.current = 0;
    }
  }, [isStreaming, streamingText, isEditing, editContent, pContent]);

  const handleFileSelect = async (path: string) => {
    onFileSelect(path);
    
    // If it's a file in the current artifact, use its content
    if (artifact?.type === 'project') {
      const file = artifact.files?.find(f => f.path === path);
      if (file) {
        setEditContent(file.content);
        setSelectedFileId(file.id);
        return;
      }
    } else if (artifact) {
      const ext = artifact.type === 'mermaid' ? 'mmd' : artifact.type === 'markdown' ? 'md' : artifact.type;
      const artifactPath = `artifacts/${artifact.title}.${ext}`;
      if (path === artifactPath) {
        setEditContent(artifact.content);
        return;
      }
    }
    
    // Try to load from disk if we have a handle
    if (workspaceHandle) {
      try {
        const hasPermission = await checkPermission(workspaceHandle);
        if (hasPermission) {
          const content = await readFileFromDirectory(workspaceHandle, path);
          setEditContent(content);
          setSelectedFileId(null);
        } else {
          setEditContent('// Permission required to read from disk.\n// Click the sync button to request permission.');
        }
      } catch (err) {
        console.error('Failed to read file from disk:', err);
        setEditContent(`// Error loading file: ${path}\n// It might be a directory or deleted.`);
      }
    } else {
      setEditContent('// No workspace connected to load external files.');
    }
  };

  React.useEffect(() => {
    if (artifact) {
      const ext = artifact.type === 'mermaid' ? 'mmd' : artifact.type === 'markdown' ? 'md' : artifact.type;
      const defaultPath = artifact.type === 'project' && artifact.files?.[0] 
        ? (sessionId ? `artifacts/${sessionId}/${artifact.files[0].path}` : artifact.files[0].path)
        : (sessionId ? `artifacts/${sessionId}/${artifact.title}.${ext}` : `artifacts/${artifact.title}.${ext}`);

      // If we already have a selection that is part of this artifact, update its content
      if (selectedFilePath) {
        if (artifact.type === 'project') {
          const file = artifact.files?.find(f => {
            const path = sessionId ? `artifacts/${sessionId}/${f.path}` : f.path;
            return path === selectedFilePath;
          });
          if (file) {
            setEditContent(file.content);
            setSelectedFileId(file.id);
            return;
          }
        } else {
          const artifactPath = sessionId 
            ? `artifacts/${sessionId}/${artifact.title}.${ext}` 
            : `artifacts/${artifact.title}.${ext}`;
          if (selectedFilePath === artifactPath) {
            setEditContent(artifact.content);
            setSelectedFileId(null);
            return;
          }
        }
      }

      // If selection is not in artifact, only switch to default if it's a new artifact ID
      // or if we have no selection at all
      const isNewArtifact = !prevArtifactIdRef.current || prevArtifactIdRef.current !== artifact.id;
      if (!selectedFilePath || isNewArtifact) {
        onFileSelect(defaultPath);
        if (artifact.type === 'project' && artifact.files?.[0]) {
          setSelectedFileId(artifact.files[0].id);
          setEditContent(artifact.files[0].content);
        } else {
          setSelectedFileId(null);
          setEditContent(artifact.content);
        }
      }
      
      prevArtifactIdRef.current = artifact.id;
      setIsEditing(false);
    }
  }, [artifact]);

  if (!artifact || (artifact.id === 'workspace-explorer' && !workspaceHandle)) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-100 text-zinc-400 p-12 text-center">
        <div className="w-16 h-16 rounded-3xl bg-white shadow-sm flex items-center justify-center mb-6">
          <Code size={32} />
        </div>
        <h3 className="text-lg font-medium text-zinc-600 mb-2">No Artifact Selected</h3>
        <p className="max-w-md text-sm">
          Generate an artifact in the chat to see it here. Artifacts support diagrams, HTML, Markdown, and SVG.
        </p>
      </div>
    );
  }

  const handleSave = async () => {
    if (isWorkspaceMode && selectedFilePath && workspaceHandle) {
      try {
        setIsSyncing(true);
        await writeProjectToDirectory(workspaceHandle, [{ path: selectedFilePath, content: editContent }]);
        if (onRefreshTree) onRefreshTree();
        setIsSyncing(false);
        setIsEditing(false);
      } catch (error) {
        console.error('Failed to save workspace file:', error);
        alert('Failed to save file to disk.');
        setIsSyncing(false);
      }
    } else {
      onSave(editContent, selectedFileId || undefined);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    if (artifact.type === 'project' && selectedFileId) {
      const file = artifact.files?.find(f => f.id === selectedFileId);
      if (file) setEditContent(file.content);
    } else {
      setEditContent(artifact.content);
    }
    setIsEditing(false);
  };

  const handleCopy = () => {
    const contentToCopy = artifact.type === 'project' && selectedFileId 
      ? artifact.files?.find(f => f.id === selectedFileId)?.content || ''
      : artifact.content;
    navigator.clipboard.writeText(contentToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = async (format: 'png' | 'svg' | 'html' | 'md') => {
    const element = document.getElementById('artifact-preview-container');
    if (!element) return;

    const contentToExport = artifact.type === 'project' && selectedFileId
      ? artifact.files?.find(f => f.id === selectedFileId)?.content || ''
      : artifact.content;

    if (format === 'png') {
      try {
        // Special handling for SVG/Mermaid which html2canvas often fails on
        const svgElement = element.querySelector('svg');
        const isMermaidOrSvg = artifact.type === 'mermaid' || artifact.type === 'svg' || 
          (artifact.type === 'project' && selectedFileId && 
           (artifact.files?.find(f => f.id === selectedFileId)?.type === 'mermaid' || 
            artifact.files?.find(f => f.id === selectedFileId)?.type === 'svg'));

        if (svgElement && isMermaidOrSvg) {
          try {
            const svgData = new XMLSerializer().serializeToString(svgElement);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            // Get natural dimensions
            const rect = svgElement.getBoundingClientRect();
            const scale = 2; // High quality
            canvas.width = rect.width * scale;
            canvas.height = rect.height * scale;
            
            img.onload = () => {
              if (ctx) {
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const link = document.createElement('a');
                link.download = `${artifact.title}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
              }
            };
            img.onerror = () => {
              throw new Error('Image loading failed');
            };
            img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
            return;
          } catch (svgErr) {
            console.warn('SVG-to-Canvas failed, falling back to html2canvas:', svgErr);
            // Fall through to html2canvas
          }
        }

        let targetElement: HTMLElement = element;
        
        // For HTML artifacts, try to capture the iframe body
        if (artifact.type === 'html' || (artifact.type === 'project' && selectedFileId && artifact.files?.find(f => f.id === selectedFileId)?.type === 'html')) {
          const iframe = element.querySelector('iframe');
          if (iframe && iframe.contentDocument && iframe.contentDocument.body) {
            targetElement = iframe.contentDocument.body;
          }
        }

        const canvas = await html2canvas(targetElement, { 
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          allowTaint: true,
        });
        
        const link = document.createElement('a');
        link.download = `${artifact.title}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      } catch (err) {
        console.error('PNG Export failed:', err);
        alert('Failed to export PNG. Try Export HTML or SVG instead.');
      }
    } else {
      const blob = new Blob([contentToExport], { type: 'text/plain' });
      const link = document.createElement('a');
      link.download = `${artifact.title}.${format}`;
      link.href = URL.createObjectURL(blob);
      link.click();
    }
  };

  return (
    <div ref={panelRef} className={cn("flex-1 flex flex-col h-full bg-white overflow-hidden", isFullScreen && "fixed inset-0 z-[100]")}>
      {/* Header */}
      <div className="p-4 border-b border-zinc-200 flex items-center justify-between bg-white z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-zinc-100 rounded-lg">
            <Code size={18} className="text-zinc-600" />
          </div>
          <div>
            <h2 className="font-semibold text-zinc-800 leading-tight">
              {artifact.title}
              {currentFile && <span className="text-zinc-400 font-normal ml-2">/ {currentFile.name}</span>}
              {!currentFile && isWorkspaceMode && selectedFilePath && <span className="text-zinc-400 font-normal ml-2">/ {selectedFilePath.split('/').pop()}</span>}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 bg-zinc-50 px-1.5 py-0.5 rounded border border-zinc-100">
                {pType}
              </span>
              {artifact.id !== 'workspace-explorer' && (
                <span className="text-[10px] text-zinc-400">
                  v{artifact.version} • {new Date(artifact.timestamp).toLocaleTimeString()}
                </span>
              )}
              {artifact.id === 'workspace-explorer' && workspaceHandle && (
                <button 
                  onClick={() => onDisconnectWorkspace?.()}
                  className="text-[10px] text-zinc-400 hover:text-red-500 transition-colors flex items-center gap-1"
                >
                  <X size={10} /> Disconnect
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl">
          <button 
            onClick={() => setView('preview')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              view === 'preview' ? "bg-white text-zinc-800 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
            )}
          >
            <Eye size={14} /> Preview
          </button>
          <button 
            onClick={() => setView('code')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              view === 'code' ? "bg-white text-zinc-800 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
            )}
          >
            <Code size={14} /> Code
          </button>
        </div>

        <div className="flex items-center gap-2">
          {view === 'code' && (
            <>
              {isEditing ? (
                <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl mr-2">
                  <button 
                    onClick={handleSave}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500 text-white shadow-sm hover:bg-emerald-600 transition-all"
                  >
                    <Save size={14} /> Save
                  </button>
                  <button 
                    onClick={handleCancel}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-50 hover:bg-zinc-200 hover:text-zinc-800 transition-all"
                  >
                    <X size={14} /> Cancel
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 text-white shadow-sm hover:bg-zinc-900 transition-all mr-2"
                >
                  <Edit size={14} /> Edit
                </button>
              )}
            </>
          )}

        <div className="flex items-center bg-zinc-100 rounded-xl p-1 mr-2">
          {artifact.id !== 'workspace-explorer' && (
            <>
              <button 
                disabled={currentIndex <= 0}
                onClick={() => onVersionSelect(currentIndex - 1)}
                className="p-1.5 text-zinc-500 hover:text-zinc-800 disabled:opacity-30"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-[10px] font-mono px-2 text-zinc-500">
                {currentIndex + 1} / {history.length}
              </span>
              <button 
                disabled={currentIndex >= history.length - 1}
                onClick={() => onVersionSelect(currentIndex + 1)}
                className="p-1.5 text-zinc-500 hover:text-zinc-800 disabled:opacity-30"
              >
                <ChevronRight size={16} />
              </button>
            </>
          )}
        </div>

          <button 
            onClick={toggleFullScreen}
            className={cn(
              "p-2 rounded-lg transition-colors mr-1",
              isFullScreen ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100"
            )}
            title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
          >
            <Maximize2 size={18} />
          </button>

          <button 
            onClick={() => handleSyncToDisk(false)}
            disabled={isSyncing}
            className={cn(
              "p-2 rounded-lg transition-colors mr-1",
              workspaceHandle ? "text-emerald-500 bg-emerald-50" : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100"
            )}
            title={workspaceHandle ? `Workspace: ${workspaceHandle.name}` : "Select Workspace"}
          >
            {isSyncing ? <RefreshCw size={18} className="animate-spin" /> : <FolderSync size={18} />}
          </button>

          <button 
            onClick={handleCopy}
            className="p-2 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded-lg transition-colors relative"
            title="Copy Code"
          >
            {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
          </button>
          
          <div className="relative group">
            <button className="p-2 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded-lg transition-colors">
              <Download size={18} />
            </button>
            {/* Added a transparent bridge to prevent menu from disappearing */}
            <div className="absolute right-0 top-full pt-2 hidden group-hover:block z-50">
              <div className="bg-white border border-zinc-200 rounded-xl shadow-xl p-2 min-w-[140px]">
                <button onClick={() => handleExport('png')} className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-50 rounded-lg flex items-center gap-2">
                  <Download size={12} /> Export PNG
                </button>
                <button onClick={() => handleExport('svg')} className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-50 rounded-lg flex items-center gap-2">
                  <Download size={12} /> Export SVG
                </button>
                <button onClick={() => handleExport('html')} className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-50 rounded-lg flex items-center gap-2">
                  <Download size={12} /> Export HTML
                </button>
                <button onClick={() => handleExport('md')} className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-50 rounded-lg flex items-center gap-2">
                  <Download size={12} /> Export Markdown
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

        <div className="flex-1 overflow-hidden relative bg-zinc-50 flex">
          {view === 'code' && (
            <FileExplorer 
              tree={workspaceTree || {
                name: workspaceHandle?.name || 'Workspace',
                kind: 'directory',
                path: '',
                children: artifact.type === 'project' && artifact.files 
                  ? artifact.files.map(f => ({ name: f.path, kind: 'file', path: f.path }))
                  : [{ 
                      name: `${artifact.title}.${artifact.type === 'mermaid' ? 'mmd' : artifact.type === 'markdown' ? 'md' : artifact.type}`, 
                      kind: 'file',
                      path: `artifacts/${artifact.title}.${artifact.type === 'mermaid' ? 'mmd' : artifact.type === 'markdown' ? 'md' : artifact.type}`
                    }]
              }}
              selectedFile={selectedFilePath}
              onFileSelect={handleFileSelect}
              expandedFolders={expandedFolders}
              onToggleFolder={(path) => setExpandedFolders(prev => ({ ...prev, [path]: !prev[path] }))}
              onRefresh={onRefreshTree}
              onDisconnect={onDisconnectWorkspace}
            />
          )}

        <div className="flex-1 overflow-hidden relative">
          {view === 'preview' ? (
            <div className="w-full h-full" id="artifact-preview-container">
              {pType === 'html' ? (
                <div className="w-full h-full bg-white">
                  <HtmlPreview content={pContent} />
                </div>
              ) : pType === 'markdown' ? (
                <ZoomableContainer className="w-full h-full" fitMode="width">
                  <div className="w-full max-w-4xl bg-white p-12 md:p-16 shadow-lg rounded-xl">
                    <div className="prose prose-zinc prose-sm md:prose-base max-w-none">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({ node, inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || '');
                            const isMermaid = match && match[1] === 'mermaid';
                            
                            if (!inline && isMermaid) {
                              return (
                                <div className="my-6 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
                                  <MermaidPreview 
                                    content={String(children).replace(/\n$/, '')} 
                                    className="!w-full !p-4 !shadow-none !rounded-none !min-h-0"
                                  />
                                </div>
                              );
                            }
                            
                            return (
                              <code className={className} {...props}>
                                {children}
                              </code>
                            );
                          }
                        }}
                      >
                        {pContent}
                      </ReactMarkdown>
                    </div>
                  </div>
                </ZoomableContainer>
              ) : (
                <ZoomableContainer className="w-full h-full">
                  {pType === 'mermaid' && <MermaidPreview content={pContent} className="natural-size" />}
                  {pType === 'svg' && (
                    <div 
                      className="svg-preview-container bg-white shadow-sm rounded-lg overflow-hidden"
                      style={{ width: '800px', height: '500px' }}
                      dangerouslySetInnerHTML={{ __html: pContent }}
                    />
                  )}
                  {pType === 'text' && (
                    <pre className="w-[800px] p-12 font-mono text-sm whitespace-pre-wrap bg-white shadow-lg rounded-xl">
                      {pContent}
                    </pre>
                  )}
                </ZoomableContainer>
              )}
            </div>
          ) : (
            <div ref={codeAreaRef} className="w-full h-full bg-white overflow-auto">
              {isWorkspaceMode && !selectedFilePath ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-400 p-8 text-center">
                  <FolderSync size={48} className="mb-4 opacity-20" />
                  <p className="text-sm">Select a file from the explorer to start working with it.</p>
                </div>
              ) : isEditing ? (
                <textarea
                  ref={textareaRef}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full h-full p-6 font-mono text-sm text-zinc-800 leading-relaxed resize-none outline-none bg-zinc-50/50"
                  spellCheck={false}
                />
              ) : (
                <pre className="p-6 font-mono text-sm text-zinc-800 leading-relaxed">
                  <code>{editContent}</code>
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

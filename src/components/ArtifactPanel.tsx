import React, { useState } from 'react';
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
  X
} from 'lucide-react';
import { Artifact } from '../types';
import { cn } from '../utils';
import { MermaidPreview } from './MermaidPreview';
import { HtmlPreview } from './HtmlPreview';
import ReactMarkdown from 'react-markdown';
import html2canvas from 'html2canvas';

interface ArtifactPanelProps {
  artifact: Artifact | null;
  history: Artifact[];
  onVersionSelect: (index: number) => void;
  currentIndex: number;
  onSave: (content: string) => void;
}

export const ArtifactPanel: React.FC<ArtifactPanelProps> = ({ 
  artifact, 
  history, 
  onVersionSelect,
  currentIndex,
  onSave
}) => {
  const [view, setView] = useState<'preview' | 'code'>('preview');
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    if (artifact) {
      setEditContent(artifact.content);
      setIsEditing(false);
    }
  }, [artifact]);

  if (!artifact) {
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

  const handleSave = () => {
    onSave(editContent);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditContent(artifact.content);
    setIsEditing(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(artifact.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = async (format: 'png' | 'svg' | 'html' | 'md') => {
    const element = document.getElementById('artifact-preview-container');
    if (!element) return;

    if (format === 'png') {
      const canvas = await html2canvas(element, { scale: 2 });
      const link = document.createElement('a');
      link.download = `${artifact.title}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } else {
      const blob = new Blob([artifact.content], { type: 'text/plain' });
      const link = document.createElement('a');
      link.download = `${artifact.title}.${format}`;
      link.href = URL.createObjectURL(blob);
      link.click();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-zinc-200 flex items-center justify-between bg-white z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-zinc-100 rounded-lg">
            <Code size={18} className="text-zinc-600" />
          </div>
          <div>
            <h2 className="font-semibold text-zinc-800 leading-tight">{artifact.title}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 bg-zinc-50 px-1.5 py-0.5 rounded border border-zinc-100">
                {artifact.type}
              </span>
              <span className="text-[10px] text-zinc-400">
                v{artifact.version} • {new Date(artifact.timestamp).toLocaleTimeString()}
              </span>
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
          </div>

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
            <div className="absolute right-0 top-full mt-1 hidden group-hover:block bg-white border border-zinc-200 rounded-xl shadow-xl p-2 z-50 min-w-[120px]">
              <button onClick={() => handleExport('png')} className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-50 rounded-lg">Export PNG</button>
              <button onClick={() => handleExport('svg')} className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-50 rounded-lg">Export SVG</button>
              <button onClick={() => handleExport('html')} className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-50 rounded-lg">Export HTML</button>
              <button onClick={() => handleExport('md')} className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-50 rounded-lg">Export Markdown</button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative bg-zinc-50">
        {view === 'preview' ? (
          <div id="artifact-preview-container" className="w-full h-full overflow-auto">
            {artifact.type === 'mermaid' && <MermaidPreview content={artifact.content} />}
            {artifact.type === 'html' && <HtmlPreview content={artifact.content} />}
            {artifact.type === 'markdown' && (
              <div className="p-8 max-w-3xl mx-auto bg-white min-h-full shadow-sm">
                <div className="prose prose-zinc prose-sm max-w-none">
                  <ReactMarkdown>{artifact.content}</ReactMarkdown>
                </div>
              </div>
            )}
            {artifact.type === 'svg' && (
              <div 
                className="w-full h-full flex items-center justify-center p-8 bg-white"
                dangerouslySetInnerHTML={{ __html: artifact.content }}
              />
            )}
            {artifact.type === 'text' && (
              <pre className="p-8 font-mono text-sm whitespace-pre-wrap bg-white min-h-full">
                {artifact.content}
              </pre>
            )}
          </div>
        ) : (
          <div className="w-full h-full bg-white overflow-auto">
            {isEditing ? (
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full h-full p-6 font-mono text-sm text-zinc-800 leading-relaxed resize-none outline-none bg-zinc-50/50"
                spellCheck={false}
              />
            ) : (
              <pre className="p-6 font-mono text-sm text-zinc-800 leading-relaxed">
                <code>{artifact.content}</code>
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

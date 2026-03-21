import React, { useState } from 'react';
import { 
  Folder, 
  File, 
  ChevronRight, 
  ChevronDown, 
  FileCode, 
  FileText, 
  Image as ImageIcon,
  Plus,
  MoreVertical
} from 'lucide-react';
import { ProjectFile } from '../types';
import { cn } from '../utils';

interface FileExplorerProps {
  files: ProjectFile[];
  selectedFileId: string | null;
  onFileSelect: (fileId: string) => void;
  onAddFile?: () => void;
  onAddFolder?: () => void;
}

interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  file?: ProjectFile;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({ 
  files, 
  selectedFileId, 
  onFileSelect,
  onAddFile,
  onAddFolder
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({ 'root': true });

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => ({ ...prev, [path]: !prev[path] }));
  };

  // Build tree structure from flat file list
  const buildTree = (files: ProjectFile[]): FileNode[] => {
    const root: FileNode[] = [];
    const folders: Record<string, FileNode> = {};

    files.forEach(file => {
      const parts = file.path.split('/');
      let currentLevel = root;
      let currentPath = '';

      parts.forEach((part, index) => {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        const isLast = index === parts.length - 1;

        if (isLast) {
          currentLevel.push({
            id: file.id,
            name: part,
            type: 'file',
            file
          });
        } else {
          if (!folders[currentPath]) {
            const newFolder: FileNode = {
              id: currentPath,
              name: part,
              type: 'folder',
              children: []
            };
            folders[currentPath] = newFolder;
            currentLevel.push(newFolder);
          }
          currentLevel = folders[currentPath].children!;
        }
      });
    });

    return root;
  };

  const tree = buildTree(files);

  const renderNode = (node: FileNode, depth: number = 0) => {
    const isExpanded = expandedFolders[node.id];
    const isSelected = node.id === selectedFileId;

    if (node.type === 'folder') {
      return (
        <div key={node.id}>
          <button 
            onClick={() => toggleFolder(node.id)}
            className="w-full flex items-center gap-1.5 py-1 px-2 hover:bg-zinc-100 rounded text-xs text-zinc-600 transition-colors group"
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <Folder size={14} className="text-amber-400 fill-amber-400/20" />
            <span className="truncate">{node.name}</span>
          </button>
          {isExpanded && node.children?.map(child => renderNode(child, depth + 1))}
        </div>
      );
    }

    const getIcon = (type: string) => {
      switch (type) {
        case 'html': return <FileCode size={14} className="text-orange-500" />;
        case 'mermaid': return <FileText size={14} className="text-emerald-500" />;
        case 'svg': return <ImageIcon size={14} className="text-pink-500" />;
        default: return <File size={14} className="text-zinc-400" />;
      }
    };

    return (
      <button 
        key={node.id}
        onClick={() => onFileSelect(node.id)}
        className={cn(
          "w-full flex items-center gap-2 py-1 px-2 rounded text-xs transition-colors group",
          isSelected ? "bg-zinc-200 text-zinc-900 font-medium" : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
        )}
        style={{ paddingLeft: `${depth * 12 + 24}px` }}
      >
        {getIcon(node.file?.type || '')}
        <span className="truncate">{node.name}</span>
      </button>
    );
  };

  return (
    <div className="w-64 h-full border-r border-zinc-200 flex flex-col bg-zinc-50/50">
      <div className="p-3 border-b border-zinc-200 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Explorer</span>
        <div className="flex items-center gap-1">
          <button onClick={onAddFile} className="p-1 hover:bg-zinc-200 rounded text-zinc-500" title="New File">
            <Plus size={14} />
          </button>
          <button className="p-1 hover:bg-zinc-200 rounded text-zinc-500">
            <MoreVertical size={14} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto py-2">
        {tree.length > 0 ? (
          tree.map(node => renderNode(node))
        ) : (
          <div className="p-8 text-center text-zinc-400 italic text-xs">
            No files in this project
          </div>
        )}
      </div>
    </div>
  );
};

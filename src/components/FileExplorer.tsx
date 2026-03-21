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
  MoreVertical,
  RefreshCw,
  X
} from 'lucide-react';
import { ProjectFile } from '../types';
import { cn } from '../utils';

interface FileExplorerProps {
  files?: ProjectFile[];
  tree?: any;
  selectedFile: string | null;
  onFileSelect: (path: string) => void;
  onAddFile?: () => void;
  onAddFolder?: () => void;
  expandedFolders?: Record<string, boolean>;
  onToggleFolder?: (path: string) => void;
  onRefresh?: () => void;
  onDisconnect?: () => void;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({ 
  files, 
  tree: externalTree,
  selectedFile, 
  onFileSelect,
  onAddFile,
  onAddFolder,
  expandedFolders: externalExpandedFolders,
  onToggleFolder,
  onRefresh,
  onDisconnect
}) => {
  const [internalExpandedFolders, setInternalExpandedFolders] = useState<Record<string, boolean>>({ '': true });
  
  const expandedFolders = externalExpandedFolders || internalExpandedFolders;

  const toggleFolder = (path: string) => {
    if (onToggleFolder) {
      onToggleFolder(path);
    } else {
      setInternalExpandedFolders(prev => ({ ...prev, [path]: !prev[path] }));
    }
  };

  // Build tree structure from flat file list if no external tree is provided
  const buildTree = (files: ProjectFile[]): any[] => {
    const root: any[] = [];
    const folders: Record<string, any> = {};

    files.forEach(file => {
      const parts = file.path.split('/');
      let currentLevel = root;
      let currentPath = '';

      parts.forEach((part, index) => {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        const isLast = index === parts.length - 1;

        if (isLast) {
          currentLevel.push({
            name: part,
            kind: 'file',
            path: file.path,
            type: file.type
          });
        } else {
          if (!folders[currentPath]) {
            const newFolder: any = {
              name: part,
              kind: 'directory',
              path: currentPath,
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

  const tree = externalTree ? [externalTree] : (files ? buildTree(files) : []);

  const renderNode = (node: any, depth: number = 0, parentPath: string = '') => {
    const currentPath = node.path || (parentPath ? `${parentPath}/${node.name}` : node.name);
    const isExpanded = expandedFolders[currentPath];
    const isSelected = currentPath === selectedFile;

    if (node.kind === 'directory') {
      return (
        <div key={currentPath}>
          <button 
            onClick={() => toggleFolder(currentPath)}
            className="w-full flex items-center gap-1.5 py-1 px-2 hover:bg-zinc-100 rounded text-xs text-zinc-600 transition-colors group"
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <Folder size={14} className="text-amber-400 fill-amber-400/20" />
            <span className="truncate">{node.name}</span>
          </button>
          {isExpanded && node.children?.map((child: any) => renderNode(child, depth + 1, currentPath))}
        </div>
      );
    }

    const getIcon = (name: string) => {
      const lowerName = name.toLowerCase();
      if (lowerName.endsWith('.html') || lowerName.endsWith('.htm')) return <FileCode size={14} className="text-orange-500" />;
      if (lowerName.endsWith('.mmd') || lowerName.endsWith('.mermaid')) return <FileText size={14} className="text-emerald-500" />;
      if (lowerName.endsWith('.md') || lowerName.endsWith('.markdown')) return <FileText size={14} className="text-blue-500" />;
      if (lowerName.endsWith('.svg') || lowerName.endsWith('.png') || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) return <ImageIcon size={14} className="text-pink-500" />;
      if (lowerName.endsWith('.js') || lowerName.endsWith('.ts') || lowerName.endsWith('.tsx') || lowerName.endsWith('.jsx')) return <FileCode size={14} className="text-blue-400" />;
      if (lowerName.endsWith('.css') || lowerName.endsWith('.scss')) return <FileCode size={14} className="text-indigo-400" />;
      if (lowerName.endsWith('.json')) return <FileCode size={14} className="text-amber-500" />;
      return <File size={14} className="text-zinc-400" />;
    };

    return (
      <button 
        key={currentPath}
        onClick={() => onFileSelect(currentPath)}
        className={cn(
          "w-full flex items-center gap-2 py-1 px-2 rounded text-xs transition-colors group",
          isSelected ? "bg-zinc-200 text-zinc-900 font-medium" : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
        )}
        style={{ paddingLeft: `${depth * 12 + 24}px` }}
      >
        {getIcon(node.name)}
        <span className="truncate">{node.name}</span>
      </button>
    );
  };

  return (
    <div className="w-64 h-full border-r border-zinc-200 flex flex-col bg-zinc-50/50">
      <div className="p-3 border-b border-zinc-200 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Explorer</span>
        <div className="flex items-center gap-1">
          {onRefresh && (
            <button onClick={onRefresh} className="p-1 hover:bg-zinc-200 rounded text-zinc-500" title="Refresh">
              <RefreshCw size={14} />
            </button>
          )}
          {onDisconnect && (
            <button onClick={onDisconnect} className="p-1 hover:bg-zinc-200 rounded text-zinc-500 hover:text-red-500" title="Disconnect Workspace">
              <X size={14} />
            </button>
          )}
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

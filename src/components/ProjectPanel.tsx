import React from 'react';
import { ProjectConfig, Artifact } from '../types';
import { 
  FolderOpen, 
  FileText, 
  CheckCircle2, 
  Circle, 
  Layers, 
  ChevronRight, 
  BookOpen, 
  History,
  Info,
  Play
} from 'lucide-react';
import { cn } from '../utils';
import { motion } from 'motion/react';

interface ProjectPanelProps {
  project: ProjectConfig;
  artifacts: Artifact[];
  onSelectArtifact: (id: string) => void;
  onAssemble?: () => void;
}

export const ProjectPanel: React.FC<ProjectPanelProps> = ({ project, artifacts, onSelectArtifact, onAssemble }) => {
  const projectArtifacts = artifacts.filter(a => {
    const title = a.title.toLowerCase();
    const isToc = title.includes('table of contents') || title.includes('оглавление') || title.includes('содержание') || title === 'toc';
    const isFinal = title.includes('final document') || title.includes('assembled document') || title.includes('итоговый документ');
    const isSystem = a.id === 'workspace-explorer' || a.id === 'streaming';
    
    // In multi-chapter mode, chapters usually have "Chapter" or "Глава" in the title
    const isChapter = title.includes('chapter') || title.includes('глава');
    
    return !isToc && !isFinal && !isSystem && isChapter;
  });

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-6 border-b border-zinc-100 bg-amber-50/30">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
            <Layers size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-900">{project.name}</h2>
            <div className="flex items-center gap-2 text-xs font-medium text-amber-600 uppercase tracking-wider">
              <span className={cn(
                "px-1.5 py-0.5 rounded bg-amber-100",
                project.status === 'completed' && "bg-emerald-100 text-emerald-600"
              )}>
                {project.status}
              </span>
              <span>•</span>
              <span>Depth {project.targetDepth}</span>
            </div>
          </div>
        </div>
        <p className="text-sm text-zinc-600 leading-relaxed">{project.description}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Blueprint Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-zinc-900 uppercase tracking-wider">
            <BookOpen size={16} className="text-amber-500" />
            Project Blueprint
          </div>
          <div className="grid grid-cols-1 gap-3">
            <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-100 hover:border-amber-200 transition-colors cursor-pointer group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <History size={16} className="text-zinc-400" />
                  </div>
                  <span className="text-sm font-medium text-zinc-700">Table of Contents</span>
                </div>
                <ChevronRight size={16} className="text-zinc-300 group-hover:text-amber-500 transition-colors" />
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-100 hover:border-amber-200 transition-colors cursor-pointer group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <Info size={16} className="text-zinc-400" />
                  </div>
                  <span className="text-sm font-medium text-zinc-700">Glossary & Style Guide</span>
                </div>
                <ChevronRight size={16} className="text-zinc-300 group-hover:text-amber-500 transition-colors" />
              </div>
            </div>
          </div>
        </section>

        {/* Chapters Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-zinc-900 uppercase tracking-wider">
              <FileText size={16} className="text-amber-500" />
              Chapters
            </div>
            <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">
              {projectArtifacts.length} GENERATED
            </span>
          </div>

          {onAssemble && projectArtifacts.length > 0 && (
            <button 
              onClick={onAssemble}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-emerald-500/20 active:scale-95 group mb-4"
            >
              <Layers size={18} className="group-hover:rotate-12 transition-transform" />
              Assemble Final Document
            </button>
          )}
          
          <div className="space-y-2">
            {projectArtifacts.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-zinc-100 rounded-3xl">
                <p className="text-sm text-zinc-400">No chapters generated yet.</p>
                <p className="text-xs text-zinc-300 mt-1">Start the generation process in the chat.</p>
              </div>
            ) : (
              projectArtifacts.map((artifact, index) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={artifact.id}
                  onClick={() => onSelectArtifact(artifact.id)}
                  className="p-4 rounded-2xl bg-zinc-50 border border-zinc-100 hover:border-amber-200 transition-all cursor-pointer group flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-xs font-bold text-zinc-400 border border-zinc-100 group-hover:border-amber-200 group-hover:text-amber-500 transition-colors">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900">{artifact.title}</h4>
                      <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold mt-0.5">Chapter {index + 1}</p>
                    </div>
                  </div>
                  <CheckCircle2 size={18} className="text-emerald-500" />
                </motion.div>
              ))
            )}
          </div>
        </section>

        {/* Storage Section */}
        <section className="pt-4 border-t border-zinc-100 space-y-4">
          <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            <FolderOpen size={12} />
            Root: {project.rootFolder}
          </div>
        </section>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { ProjectConfig } from '../types';
import { X, Settings2, Target, Users, Type, FolderOpen, Play } from 'lucide-react';
import { motion } from 'motion/react';

interface ProjectConfiguratorProps {
  onClose: () => void;
  onSave: (config: ProjectConfig) => void;
  initialConfig?: ProjectConfig;
}

export const ProjectConfigurator: React.FC<ProjectConfiguratorProps> = ({ onClose, onSave, initialConfig }) => {
  const [name, setName] = useState(initialConfig?.name || '');
  const [description, setDescription] = useState(initialConfig?.description || '');
  const [targetDepth, setTargetDepth] = useState(initialConfig?.targetDepth || 3);
  const [tone, setTone] = useState(initialConfig?.tone || 'Professional');
  const [audience, setAudience] = useState(initialConfig?.audience || 'General');
  const [rootFolder, setRootFolder] = useState(initialConfig?.rootFolder || '');

  const handleSave = () => {
    if (!name || !description) return;
    
    const config: ProjectConfig = {
      id: initialConfig?.id || crypto.randomUUID(),
      name,
      description,
      targetDepth,
      tone,
      audience,
      rootFolder: rootFolder || `projects/${name.toLowerCase().replace(/\s+/g, '-')}`,
      status: initialConfig?.status || 'idle'
    };
    
    onSave(config);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
              <Settings2 size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-900">Project Orchestrator</h2>
              <p className="text-sm text-zinc-500">Configure multi-chapter document generation</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-200 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          <div className="space-y-4">
            <label className="block text-sm font-bold text-zinc-700 uppercase tracking-wider">Project Identity</label>
            <input 
              type="text" 
              placeholder="Project Name (e.g., Quantum Computing Guide)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-zinc-100 border-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
            <textarea 
              placeholder="What is this document about? (e.g., A comprehensive guide for beginners...)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-2xl bg-zinc-100 border-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-sm font-bold text-zinc-700 uppercase tracking-wider">
                <Target size={16} className="text-indigo-500" />
                Target Depth
              </label>
              <div className="flex items-center gap-4">
                <input 
                  type="range" 
                  min="1" 
                  max="5" 
                  step="1"
                  value={targetDepth}
                  onChange={(e) => setTargetDepth(parseInt(e.target.value))}
                  className="flex-1 accent-indigo-600"
                />
                <span className="text-lg font-bold text-indigo-600 w-8 text-center">{targetDepth}</span>
              </div>
              <p className="text-xs text-zinc-500 italic">
                {targetDepth === 1 && "Brief overview (1-3 chapters)"}
                {targetDepth === 2 && "Standard report (3-5 chapters)"}
                {targetDepth === 3 && "Detailed guide (5-8 chapters)"}
                {targetDepth === 4 && "Comprehensive book (8-12 chapters)"}
                {targetDepth === 5 && "Exhaustive documentation (12+ chapters)"}
              </p>
            </div>

            <div className="space-y-4">
              <label className="flex items-center gap-2 text-sm font-bold text-zinc-700 uppercase tracking-wider">
                <Users size={16} className="text-indigo-500" />
                Audience & Tone
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select 
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-zinc-100 border-none text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option>Professional</option>
                  <option>Academic</option>
                  <option>Casual</option>
                  <option>Technical</option>
                  <option>Creative</option>
                </select>
                <select 
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-zinc-100 border-none text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option>General</option>
                  <option>Experts</option>
                  <option>Beginners</option>
                  <option>Decision Makers</option>
                  <option>Students</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm font-bold text-zinc-700 uppercase tracking-wider">
              <FolderOpen size={16} className="text-indigo-500" />
              Storage Path
            </label>
            <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-zinc-100 text-zinc-500 text-sm italic">
              <span>/</span>
              <input 
                type="text" 
                placeholder={`projects/${name.toLowerCase().replace(/\s+/g, '-') || 'my-project'}`}
                value={rootFolder}
                onChange={(e) => setRootFolder(e.target.value)}
                className="bg-transparent border-none focus:ring-0 p-0 flex-1 text-zinc-700 not-italic"
              />
            </div>
          </div>
        </div>

        <div className="p-6 bg-zinc-50 border-t border-zinc-100 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-zinc-600 font-medium hover:bg-zinc-200 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={!name || !description}
            className="px-8 py-2.5 rounded-xl bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 disabled:shadow-none transition-all flex items-center gap-2"
          >
            <Play size={18} />
            Initialize Project
          </button>
        </div>
      </motion.div>
    </div>
  );
};

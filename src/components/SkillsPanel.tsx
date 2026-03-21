import React, { useState } from 'react';
import { 
  Book, 
  Plus, 
  Search, 
  Folder, 
  FileText, 
  ChevronRight, 
  ChevronDown,
  Trash2,
  Edit2,
  Check,
  X,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { Skill } from '../types';
import { cn, generateId } from '../utils';

interface SkillsPanelProps {
  skills: Skill[];
  onUpdateSkill: (skill: Skill) => void;
  onAddSkill: (skill: Skill) => void;
  onDeleteSkill: (id: string) => void;
  activeSkillIds: string[];
  onToggleSkill: (id: string) => void;
}

export const SkillsPanel: React.FC<SkillsPanelProps> = ({
  skills,
  onUpdateSkill,
  onAddSkill,
  onDeleteSkill,
  activeSkillIds,
  onToggleSkill
}) => {
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newSkill, setNewSkill] = useState<Partial<Skill>>({
    name: '',
    description: '',
    content: '',
    path: 'General',
    enabled: true
  });

  const filteredSkills = skills.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.description.toLowerCase().includes(search.toLowerCase())
  );

  // Group skills by path
  const groupedSkills: Record<string, Skill[]> = {};
  filteredSkills.forEach(s => {
    const path = s.path || 'General';
    if (!groupedSkills[path]) groupedSkills[path] = [];
    groupedSkills[path].push(s);
  });

  const handleSave = () => {
    if (editingId) {
      const skill = skills.find(s => s.id === editingId);
      if (skill) {
        onUpdateSkill({ ...skill, ...newSkill } as Skill);
      }
      setEditingId(null);
    } else {
      onAddSkill({
        id: generateId(),
        name: newSkill.name || 'Untitled Skill',
        description: newSkill.description || '',
        content: newSkill.content || '',
        path: newSkill.path || 'General',
        enabled: true
      });
      setIsAdding(false);
    }
    setNewSkill({ name: '', description: '', content: '', path: 'General' });
  };

  const startEditing = (skill: Skill) => {
    setEditingId(skill.id);
    setNewSkill(skill);
    setIsAdding(true);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900 text-zinc-300">
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-white">
          <Book size={18} />
          SKILLS
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
        >
          <Plus size={18} />
        </button>
      </div>

      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
          <input 
            type="text"
            placeholder="Search skills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 pl-9 pr-4 text-xs focus:outline-none focus:border-zinc-700 transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 space-y-4 pb-4">
        {Object.entries(groupedSkills).map(([path, pathSkills]) => (
          <div key={path} className="space-y-1">
            <div className="px-3 py-1 flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              <Folder size={10} />
              {path}
            </div>
            {pathSkills.map(skill => (
              <div 
                key={skill.id}
                className={cn(
                  "group flex flex-col gap-1 p-3 rounded-xl transition-all border border-transparent",
                  activeSkillIds.includes(skill.id) 
                    ? "bg-zinc-800/50 border-zinc-700/50" 
                    : "hover:bg-zinc-800/30"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText size={14} className={activeSkillIds.includes(skill.id) ? "text-emerald-400" : "text-zinc-600"} />
                    <span className="text-sm font-medium truncate text-zinc-200">{skill.name}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => onToggleSkill(skill.id)}
                      className={cn(
                        "p-1 transition-colors",
                        activeSkillIds.includes(skill.id) ? "text-emerald-400" : "text-zinc-500 hover:text-zinc-300"
                      )}
                      title={activeSkillIds.includes(skill.id) ? "Disable for this chat" : "Enable for this chat"}
                    >
                      {activeSkillIds.includes(skill.id) ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                    </button>
                    <button 
                      onClick={() => startEditing(skill)}
                      className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={() => onDeleteSkill(skill.id)}
                      className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-zinc-500 line-clamp-2 leading-relaxed">
                  {skill.description}
                </p>
              </div>
            ))}
          </div>
        ))}

        {skills.length === 0 && !isAdding && (
          <div className="py-12 text-center text-zinc-600">
            <Book size={32} className="mx-auto mb-3 opacity-20" />
            <p className="text-xs">No skills defined yet</p>
            <button 
              onClick={() => setIsAdding(true)}
              className="mt-4 text-xs text-zinc-400 hover:text-white underline underline-offset-4"
            >
              Create your first skill
            </button>
          </div>
        )}
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Book size={20} className="text-emerald-400" />
                {editingId ? 'Edit Skill' : 'New Skill'}
              </h3>
              <button onClick={() => setIsAdding(false)} className="text-zinc-500 hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Name</label>
                <input 
                  type="text"
                  value={newSkill.name}
                  onChange={(e) => setNewSkill(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Senior QA Engineer"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Path / Category</label>
                  <input 
                    type="text"
                    value={newSkill.path}
                    onChange={(e) => setNewSkill(prev => ({ ...prev, path: e.target.value }))}
                    placeholder="e.g., Testing"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Description</label>
                  <input 
                    type="text"
                    value={newSkill.description}
                    onChange={(e) => setNewSkill(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief summary of the skill"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5 flex-1 flex flex-col min-h-[300px]">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Instructions (Markdown)</label>
                <textarea 
                  value={newSkill.content}
                  onChange={(e) => setNewSkill(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Describe how the AI should behave when this skill is active..."
                  className="flex-1 w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-white font-mono resize-none focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>
            </div>

            <div className="p-6 border-t border-zinc-800 bg-zinc-950/50 flex items-center justify-end gap-3">
              <button 
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={!newSkill.name}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:hover:bg-emerald-500 text-white px-6 py-2 rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-500/20"
              >
                <Check size={18} />
                {editingId ? 'Update Skill' : 'Create Skill'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

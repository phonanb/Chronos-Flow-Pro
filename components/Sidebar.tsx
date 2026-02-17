
import React, { useState, useRef } from 'react';
import { ProfileBlock, Category, Resource, LunchBreakRule, EveningBreakRule, Snapshot } from '../types';
import { COLOR_MAP } from '../constants';
import { Plus, Coffee, Clock, Settings, Edit3, Trash2, X, ChevronLeft, ChevronRight, Tags, Boxes, GripVertical, Download, Upload, FileText, Moon, Sparkles, Loader2, History, RotateCcw, Save } from 'lucide-react';
import { reorder, formatTime } from '../utils';

const InputLabel = ({ children }: { children?: React.ReactNode }) => (
  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block mb-1 tracking-wider">
    {children}
  </label>
);

interface SidebarProps {
  profiles: ProfileBlock[];
  categories: Category[];
  resources: Resource[];
  onAddBlockFromProfile: (profile: ProfileBlock) => void;
  onUpdateProfiles: (profiles: ProfileBlock[]) => void;
  onUpdateCategories: (categories: Category[]) => void;
  onUpdateResources: (resources: Resource[]) => void;
  lunchRule: LunchBreakRule;
  onUpdateLunchRule: (rule: LunchBreakRule) => void;
  eveningRule: EveningBreakRule;
  onUpdateEveningRule: (rule: EveningBreakRule) => void;
  isOpen: boolean;
  onToggle: () => void;
  onExportCFP: () => void;
  onImportCFP: (file: File) => void;
  onExportCSV: () => void;
  onExportPDF: () => void;
  onAiGenerate: () => Promise<void>;
  isAiGenerating: boolean;
  history: Snapshot[];
  onTakeSnapshot: () => void;
  onRestoreSnapshot: (snapshot: Snapshot) => void;
  onDeleteSnapshot: (id: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  profiles, categories, resources, 
  onAddBlockFromProfile, onUpdateProfiles, onUpdateCategories, onUpdateResources,
  lunchRule, onUpdateLunchRule, eveningRule, onUpdateEveningRule, isOpen, onToggle,
  onExportCFP, onImportCFP, onExportCSV, onExportPDF, onAiGenerate, isAiGenerating,
  history, onTakeSnapshot, onRestoreSnapshot, onDeleteSnapshot
}) => {
  const [activeTab, setActiveTab] = useState<'templates' | 'ai' | 'categories' | 'resources' | 'history' | 'rules'>('templates');
  const [editingProfile, setEditingProfile] = useState<ProfileBlock | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isMobile = window.innerWidth < 1024;

  const handleDragStartItem = (idx: number) => setDraggedIdx(idx);
  
  const handleTemplateDragStart = (e: React.DragEvent, profile: ProfileBlock) => {
    e.dataTransfer.setData('application/json', JSON.stringify(profile));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOverItem = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === idx) return;
    
    if (activeTab === 'templates') {
      onUpdateProfiles(reorder(profiles, draggedIdx, idx));
    } else if (activeTab === 'categories') {
      onUpdateCategories(reorder(categories, draggedIdx, idx));
    } else if (activeTab === 'resources') {
      onUpdateResources(reorder(resources, draggedIdx, idx));
    }
    setDraggedIdx(idx);
  };

  if (!isOpen && !isMobile) {
    return (
      <div className="hidden lg:flex w-full sidebar-container bg-white dark:bg-dark-surface border-r dark:border-dark-border flex-col items-center py-4 gap-6 h-full transition-all shrink-0">
        <button onClick={onToggle} title="Expand Library" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500"><ChevronRight size={20} /></button>
        <button onClick={() => {onToggle(); setActiveTab('templates');}} className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg"><Clock size={20} /></button>
        <button onClick={() => {onToggle(); setActiveTab('history');}} className="p-2 hover:bg-slate-50 text-slate-600 rounded-lg"><History size={20} /></button>
        <button onClick={() => {onToggle(); setActiveTab('ai');}} className="p-2 hover:bg-purple-50 text-purple-600 rounded-lg"><Sparkles size={20} /></button>
        <button onClick={() => {onToggle(); setActiveTab('categories');}} className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-lg"><Tags size={20} /></button>
        <button onClick={() => {onToggle(); setActiveTab('resources');}} className="p-2 hover:bg-amber-50 text-amber-600 rounded-lg"><Boxes size={20} /></button>
      </div>
    );
  }

  const inputClasses = "w-full text-sm p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800 dark:text-slate-200";

  return (
    <div className="w-full sidebar-container flex flex-col bg-white dark:bg-dark-surface h-full overflow-hidden transition-all shrink-0 z-50">
      <div className="p-4 border-b dark:border-dark-border flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
        <div className="flex gap-1">
          {['templates', 'history', 'ai', 'categories', 'resources', 'rules'].map((tab) => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab as any)} 
              title={`Switch to ${tab}`}
              className={`p-2 rounded-lg transition-colors ${activeTab === tab ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800'}`}
            >
              {tab === 'templates' && <Clock size={18} />}
              {tab === 'history' && <History size={18} />}
              {tab === 'ai' && <Sparkles size={18} />}
              {tab === 'categories' && <Tags size={18} />}
              {tab === 'resources' && <Boxes size={18} />}
              {tab === 'rules' && <Settings size={18} />}
            </button>
          ))}
        </div>
        {!isMobile && <button onClick={onToggle} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500"><ChevronLeft size={18} /></button>}
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {activeTab === 'templates' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Quick Templates</h3>
              <button onClick={() => setEditingProfile({ id: Math.random().toString(36).substr(2, 9), name: '', categoryId: categories[0]?.id || '', defaultDuration: 60, color: 'blue', resourceIds: [] })} className="p-1 hover:bg-indigo-50 text-indigo-600 rounded"><Plus size={16} /></button>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {profiles.map((p, idx) => (
                <div key={p.id} draggable onDragStart={(e) => { handleDragStartItem(idx); handleTemplateDragStart(e, p); }} onDragOver={(e) => handleDragOverItem(e, idx)} className="group relative">
                  <button onClick={() => onAddBlockFromProfile(p)} className="w-full text-left p-2.5 rounded-lg border dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all flex items-center gap-3">
                    <div className={`w-1.5 h-6 rounded-full ${COLOR_MAP[categories.find(c => c.id === p.categoryId)?.color || 'slate']?.split(' ')[0]}`}></div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{p.name || 'Untitled'}</p>
                      <p className="text-[9px] text-slate-400">{p.defaultDuration}m • {categories.find(c => c.id === p.categoryId)?.name}</p>
                    </div>
                  </button>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button onClick={() => setEditingProfile(p)} className="p-1 text-slate-500 hover:text-indigo-600"><Edit3 size={12} /></button>
                     <button onClick={() => onUpdateProfiles(profiles.filter(op => op.id !== p.id))} className="p-1 text-slate-500 hover:text-red-600"><Trash2 size={12} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Version History</h3>
              <button onClick={onTakeSnapshot} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-bold shadow-md hover:bg-indigo-700 transition-all">
                <Save size={12} /> Milestone
              </button>
            </div>
            <div className="space-y-2">
              {history.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-[10px] uppercase font-bold tracking-widest border-2 border-dashed dark:border-slate-800 rounded-xl">
                  No snapshots yet
                </div>
              ) : history.map((s) => (
                <div key={s.id} className="p-3 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 rounded-xl group transition-all">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate max-w-[140px]">{s.name}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => onRestoreSnapshot(s)} className="p-1.5 text-indigo-600 hover:bg-white dark:hover:bg-slate-800 rounded" title="Restore"><RotateCcw size={12} /></button>
                      <button onClick={() => onDeleteSnapshot(s.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white dark:hover:bg-slate-800 rounded"><Trash2 size={12} /></button>
                    </div>
                  </div>
                  <div className="text-[9px] text-slate-400 font-mono">
                    {new Date(s.timestamp).toLocaleTimeString()} • {s.blocks.length} Units
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="space-y-6">
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-2xl">
               <p className="text-xs text-purple-700 dark:text-purple-300 mb-4 leading-relaxed">Synthesize a complete 7-day plan from your templates.</p>
               <button onClick={onAiGenerate} disabled={isAiGenerating} className={`w-full py-4 rounded-xl flex items-center justify-center gap-3 font-bold text-sm transition-all shadow-lg ${isAiGenerating ? 'bg-slate-200 cursor-not-allowed' : 'bg-purple-600 text-white hover:bg-purple-700 shadow-purple-500/20'}`}>
                  {isAiGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                  {isAiGenerating ? 'Synthesizing...' : 'Generate 7-Day Plan'}
               </button>
            </div>
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Categories</h3>
              <button onClick={() => setEditingCategory({ id: Math.random().toString(36).substr(2, 9), name: '', color: 'blue' })} className="p-1 hover:bg-emerald-50 text-emerald-600 rounded"><Plus size={16} /></button>
            </div>
            {categories.map((c, idx) => (
              <div key={c.id} draggable onDragStart={() => handleDragStartItem(idx)} onDragOver={(e) => handleDragOverItem(e, idx)} className="flex items-center justify-between p-2.5 border dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 group">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${COLOR_MAP[c.color]?.split(' ')[0]}`}></div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{c.name}</span>
                </div>
                <div className="flex gap-1 items-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setEditingCategory(c)} className="p-1 text-slate-400 hover:text-emerald-600"><Edit3 size={12} /></button>
                  <button onClick={() => onUpdateCategories(categories.filter(oc => oc.id !== c.id))} className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'resources' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Equipment</h3>
              <button onClick={() => setEditingResource({ id: Math.random().toString(36).substr(2, 9), name: '', description: '' })} className="p-1 hover:bg-amber-50 text-amber-600 rounded"><Plus size={16} /></button>
            </div>
            {resources.map((r, idx) => (
              <div key={r.id} draggable onDragStart={() => handleDragStartItem(idx)} onDragOver={(e) => handleDragOverItem(e, idx)} className="p-2.5 border dark:border-slate-800 rounded-lg hover:bg-slate-50 group">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Boxes size={12} className="text-amber-500" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{r.name}</span>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditingResource(r)} className="p-1 text-slate-400 hover:text-amber-600"><Edit3 size={12} /></button>
                    <button onClick={() => onUpdateResources(resources.filter(or => or.id !== r.id))} className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={12} /></button>
                  </div>
                </div>
                <p className="text-[9px] text-slate-400 truncate">{r.description}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'rules' && (
          <div className="space-y-6">
             <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border dark:border-slate-800">
                <div className="flex items-center justify-between mb-2">
                   <div className="flex items-center gap-2"><Coffee size={14} className="text-amber-600" /><label className="text-xs font-bold text-slate-600 dark:text-slate-300">Lunch Break</label></div>
                   <input type="checkbox" checked={lunchRule.enabled} onChange={(e) => onUpdateLunchRule({ ...lunchRule, enabled: e.target.checked })} className="w-4 h-4 rounded text-indigo-600" />
                </div>
                {lunchRule.enabled && (
                  <div className="space-y-3 mt-4">
                     <div><InputLabel>Start (m)</InputLabel><input type="number" step="15" className={inputClasses} value={lunchRule.startTime} onChange={(e) => onUpdateLunchRule({...lunchRule, startTime: parseInt(e.target.value)})}/></div>
                     <div><InputLabel>End (m)</InputLabel><input type="number" step="15" className={inputClasses} value={lunchRule.endTime} onChange={(e) => onUpdateLunchRule({...lunchRule, endTime: parseInt(e.target.value)})}/></div>
                  </div>
                )}
             </div>

             <div className="space-y-3">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Project Management</h3>
                <div className="grid grid-cols-1 gap-2">
                   <button onClick={onExportCFP} className="flex items-center justify-center gap-2 p-3 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold border border-indigo-100 hover:bg-indigo-100 transition-colors"><Download size={14} /> Export .CFP</button>
                   <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-2 p-3 bg-slate-50 text-slate-600 rounded-lg text-xs font-bold border border-slate-200 hover:bg-slate-100 transition-colors"><Upload size={14} /> Import .CFP</button>
                   <input type="file" ref={fileInputRef} className="hidden" accept=".cfp" onChange={(e) => e.target.files && onImportCFP(e.target.files[0])}/>
                </div>
                <div className="grid grid-cols-1 gap-2">
                   <button onClick={onExportCSV} className="flex items-center justify-center gap-2 p-3 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold border border-emerald-100"><FileText size={14} /> CSV Report</button>
                   <button onClick={onExportPDF} className="flex items-center justify-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg text-xs font-bold border border-red-100"><FileText size={14} /> Print PDF</button>
                </div>
             </div>
          </div>
        )}
      </div>

      {editingProfile && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4" onClick={() => setEditingProfile(null)}>
          <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
             <div className="flex justify-between items-center"><h3 className="font-bold text-slate-800 dark:text-slate-100">Template Setup</h3><button onClick={() => setEditingProfile(null)}><X size={18} /></button></div>
             <div><InputLabel>Title</InputLabel><input className={inputClasses} value={editingProfile.name} onChange={e => setEditingProfile({...editingProfile, name: e.target.value})} /></div>
             <div className="flex gap-4">
                <div className="flex-1"><InputLabel>Category</InputLabel><select className={inputClasses} value={editingProfile.categoryId} onChange={e => setEditingProfile({...editingProfile, categoryId: e.target.value})}>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                <div className="w-24"><InputLabel>Min</InputLabel><input type="number" className={inputClasses} value={editingProfile.defaultDuration} onChange={e => setEditingProfile({...editingProfile, defaultDuration: parseInt(e.target.value)})}/></div>
             </div>
             <div><InputLabel>Resources</InputLabel><div className="max-h-32 overflow-y-auto custom-scrollbar p-1 border rounded-lg">{resources.map(r => (<label key={r.id} className="flex items-center gap-2 text-xs p-1.5 cursor-pointer hover:bg-slate-50 rounded"><input type="checkbox" checked={editingProfile.resourceIds.includes(r.id)} onChange={e => { const ids = e.target.checked ? [...editingProfile.resourceIds, r.id] : editingProfile.resourceIds.filter(id => id !== r.id); setEditingProfile({...editingProfile, resourceIds: ids}); }} className="rounded" /><span className="text-slate-700 dark:text-slate-300">{r.name}</span></label>))}</div></div>
             <button onClick={() => { onUpdateProfiles(profiles.find(p => p.id === editingProfile.id) ? profiles.map(p => p.id === editingProfile.id ? editingProfile : p) : [...profiles, editingProfile]); setEditingProfile(null); }} className="w-full py-3 font-bold text-white bg-indigo-600 rounded-xl">Apply Changes</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;

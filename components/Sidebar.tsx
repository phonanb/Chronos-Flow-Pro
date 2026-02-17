
import React, { useState, useRef } from 'react';
import { ProfileBlock, Category, Resource, LunchBreakRule, EveningBreakRule, Snapshot } from '../types';
import { COLOR_MAP } from '../constants';
import { Plus, Coffee, Clock, Settings, Edit3, Trash2, X, ChevronLeft, ChevronRight, Tags, Boxes, GripVertical, Download, Upload, FileText, Moon, Sparkles, Loader2, History, RotateCcw, Save, Archive, Target } from 'lucide-react';
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
  onTakeSnapshot: (name?: string) => void;
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
      <div className="hidden lg:flex w-full sidebar-container bg-white dark:bg-dark-surface border-r dark:border-dark-border flex-col items-center py-6 gap-8 h-full transition-all shrink-0">
        <button onClick={onToggle} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500"><ChevronRight size={20} /></button>
        <button onClick={() => {onToggle(); setActiveTab('templates');}} className="p-2 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl"><Clock size={20} /></button>
        <button onClick={() => {onToggle(); setActiveTab('history');}} className="p-2 text-slate-500 hover:text-indigo-600 rounded-xl"><History size={20} /></button>
        <button onClick={() => {onToggle(); setActiveTab('ai');}} className="p-2 text-slate-500 hover:text-purple-600 rounded-xl"><Sparkles size={20} /></button>
        <button onClick={() => {onToggle(); setActiveTab('rules');}} className="p-2 text-slate-500 hover:text-amber-600 rounded-xl"><Settings size={20} /></button>
      </div>
    );
  }

  const inputClasses = "w-full text-sm font-medium p-3 bg-slate-50 dark:bg-slate-900 border border-transparent focus:border-indigo-500 dark:border-slate-800 rounded-xl outline-none transition-all text-slate-800 dark:text-slate-100 shadow-sm";

  return (
    <div className="w-full sidebar-container flex flex-col bg-white dark:bg-dark-surface h-full overflow-hidden transition-all shrink-0 z-50 shadow-2xl">
      <div className="p-4 border-b dark:border-dark-border flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
        <div className="flex gap-2">
          {['templates', 'history', 'ai', 'categories', 'resources', 'rules'].map((tab) => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab as any)} 
              className={`p-2.5 rounded-xl transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
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
        {!isMobile && <button onClick={onToggle} className="p-2.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl text-slate-500"><ChevronLeft size={18} /></button>}
      </div>

      <div className="flex-1 overflow-y-auto p-4 lg:p-6 custom-scrollbar space-y-8">
        {activeTab === 'templates' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-black text-slate-800 dark:text-slate-100 text-xs uppercase tracking-widest">Component Library</h3>
              <button onClick={() => setEditingProfile({ id: Math.random().toString(36).substr(2, 9), name: '', categoryId: categories[0]?.id || '', defaultDuration: 60, color: 'blue', resourceIds: [] })} className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl hover:scale-110 transition-transform"><Plus size={16} /></button>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {profiles.map((p, idx) => (
                <div key={p.id} draggable onDragStart={(e) => { handleDragStartItem(idx); handleTemplateDragStart(e, p); }} onDragOver={(e) => handleDragOverItem(e, idx)} className="group relative">
                  <div className="absolute -left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-40 transition-opacity cursor-grab"><GripVertical size={14} /></div>
                  <button onClick={() => onAddBlockFromProfile(p)} className="w-full text-left p-4 rounded-2xl border dark:border-slate-800 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 bg-white dark:bg-slate-900/50 shadow-sm transition-all flex items-center gap-4 active:scale-[0.98]">
                    <div className={`w-3 h-10 rounded-full ${COLOR_MAP[categories.find(c => c.id === p.categoryId)?.color || 'slate']?.split(' ')[0]}`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-slate-800 dark:text-slate-100 truncate uppercase tracking-tighter">{p.name || 'Untitled Template'}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{p.defaultDuration}m • {categories.find(c => c.id === p.categoryId)?.name}</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity no-print">
                       <button onClick={(e) => { e.stopPropagation(); setEditingProfile(p); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg"><Edit3 size={14} /></button>
                       <button onClick={(e) => { e.stopPropagation(); onUpdateProfiles(profiles.filter(op => op.id !== p.id)); }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 size={14} /></button>
                    </div>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-black text-slate-800 dark:text-slate-100 text-xs uppercase tracking-widest">Checkpoints</h3>
              <button onClick={() => onTakeSnapshot()} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all">
                <Target size={14} /> Milestone
              </button>
            </div>
            <div className="space-y-3">
              {history.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed dark:border-slate-800 rounded-[32px] gap-4">
                  <Archive size={32} strokeWidth={1} />
                  <p className="text-[10px] uppercase font-black tracking-widest">Timeline is empty</p>
                </div>
              ) : history.map((s) => (
                <div key={s.id} className="p-4 bg-white dark:bg-slate-900/50 border dark:border-slate-800 rounded-2xl group hover:border-indigo-500/30 transition-all shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-2 h-2 rounded-full ${s.name.includes('Archive') ? 'bg-slate-400' : 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.4)]'}`}></div>
                      <span className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => onRestoreSnapshot(s)} className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg" title="Restore this version"><RotateCcw size={14} /></button>
                      <button onClick={() => onDeleteSnapshot(s.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    <span>{new Date(s.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • {s.blocks.length} Items</span>
                    <span className="text-[9px] font-mono opacity-60">ID:{s.id.slice(0,4)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="space-y-6">
            <div className="p-6 bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-100 dark:border-purple-800 rounded-[32px] text-center">
               <div className="w-12 h-12 bg-purple-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-purple-500/20"><Sparkles size={24} /></div>
               <h3 className="font-black text-purple-900 dark:text-purple-200 text-sm uppercase tracking-widest mb-2">Chronos AI Planner</h3>
               <p className="text-[11px] text-purple-700 dark:text-purple-400 font-medium leading-relaxed mb-6">Let Gemini synthesize your production templates into a conflict-free 7-day operational plan.</p>
               <button onClick={onAiGenerate} disabled={isAiGenerating} className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl ${isAiGenerating ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-purple-600 text-white hover:scale-105 active:scale-95 shadow-purple-500/30'}`}>
                  {isAiGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                  {isAiGenerating ? 'Synthesizing' : 'Generate Flow'}
               </button>
            </div>
          </div>
        )}

        {activeTab === 'rules' && (
          <div className="space-y-8">
             <div className="p-5 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 rounded-3xl space-y-4">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3"><div className="p-2 bg-amber-100 dark:bg-amber-900/20 text-amber-600 rounded-lg"><Coffee size={16} /></div><label className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">Staff Breaks</label></div>
                   <input type="checkbox" checked={lunchRule.enabled} onChange={(e) => onUpdateLunchRule({ ...lunchRule, enabled: e.target.checked })} className="w-5 h-5 rounded-lg border-2 border-slate-300 dark:border-slate-700 text-indigo-600 transition-all" />
                </div>
                {lunchRule.enabled && (
                  <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                     <div className="space-y-1"><InputLabel>Shift Start</InputLabel><input type="number" step="15" className={inputClasses} value={lunchRule.startTime} onChange={(e) => onUpdateLunchRule({...lunchRule, startTime: parseInt(e.target.value)})}/></div>
                     <div className="space-y-1"><InputLabel>Shift End</InputLabel><input type="number" step="15" className={inputClasses} value={lunchRule.endTime} onChange={(e) => onUpdateLunchRule({...lunchRule, endTime: parseInt(e.target.value)})}/></div>
                  </div>
                )}
             </div>

             <div className="space-y-4">
                <h3 className="font-black text-slate-800 dark:text-slate-100 text-xs uppercase tracking-widest px-1">Infrastructure</h3>
                <div className="grid grid-cols-2 gap-3">
                   <button onClick={onExportCFP} className="flex flex-col items-center gap-3 p-4 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 hover:scale-105 transition-all"><Download size={20} /><span className="text-[10px] font-black uppercase">CFP Save</span></button>
                   <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900 text-slate-500 rounded-2xl border border-slate-200 dark:border-slate-800 hover:scale-105 transition-all"><Upload size={20} /><span className="text-[10px] font-black uppercase">Load</span></button>
                   <input type="file" ref={fileInputRef} className="hidden" accept=".cfp" onChange={(e) => e.target.files && onImportCFP(e.target.files[0])}/>
                </div>
                <div className="grid grid-cols-2 gap-3">
                   <button onClick={onExportCSV} className="flex items-center justify-center gap-2 p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 font-black text-[10px] uppercase tracking-widest"><FileText size={16} /> CSV</button>
                   <button onClick={onExportPDF} className="flex items-center justify-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl border border-red-100 dark:border-red-900/30 font-black text-[10px] uppercase tracking-widest"><FileText size={16} /> Print</button>
                </div>
             </div>
          </div>
        )}
      </div>

      {editingProfile && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setEditingProfile(null)}>
          <div className="bg-white dark:bg-dark-surface rounded-[40px] shadow-2xl w-full max-w-sm p-8 space-y-6 relative border dark:border-dark-border" onClick={e => e.stopPropagation()}>
             <button onClick={() => setEditingProfile(null)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-red-500 rounded-xl transition-colors"><X size={20} /></button>
             <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Logic Template</h3>
             <div className="space-y-5">
                <div><InputLabel>Process Name</InputLabel><input className={inputClasses} value={editingProfile.name} onChange={e => setEditingProfile({...editingProfile, name: e.target.value})} placeholder="e.g., Autoclave Cycle A" /></div>
                <div className="flex gap-4">
                   <div className="flex-1"><InputLabel>Category</InputLabel><select className={inputClasses} value={editingProfile.categoryId} onChange={e => setEditingProfile({...editingProfile, categoryId: e.target.value})}>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                   <div className="w-24"><InputLabel>Duration (m)</InputLabel><input type="number" className={inputClasses} value={editingProfile.defaultDuration} onChange={e => setEditingProfile({...editingProfile, defaultDuration: parseInt(e.target.value)})}/></div>
                </div>
                <div><InputLabel>Equipment Lock</InputLabel><div className="max-h-40 overflow-y-auto custom-scrollbar p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl space-y-2">{resources.map(r => (<label key={r.id} className="flex items-center gap-3 text-xs font-bold p-2.5 cursor-pointer hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-colors"><input type="checkbox" checked={editingProfile.resourceIds.includes(r.id)} onChange={e => { const ids = e.target.checked ? [...editingProfile.resourceIds, r.id] : editingProfile.resourceIds.filter(id => id !== r.id); setEditingProfile({...editingProfile, resourceIds: ids}); }} className="w-4 h-4 rounded text-indigo-600" /><span className="text-slate-700 dark:text-slate-200">{r.name}</span></label>))}</div></div>
             </div>
             <button onClick={() => { onUpdateProfiles(profiles.find(p => p.id === editingProfile.id) ? profiles.map(p => p.id === editingProfile.id ? editingProfile : p) : [...profiles, editingProfile]); setEditingProfile(null); }} className="w-full py-4 font-black text-white bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all text-xs uppercase tracking-widest">Apply Configuration</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;

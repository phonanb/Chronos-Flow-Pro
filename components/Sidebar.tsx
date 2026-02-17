
import React, { useState } from 'react';
import { ProfileBlock, Category, Resource, LunchBreakRule, EveningBreakRule, Snapshot } from '../types';
import { COLOR_MAP } from '../constants';
import { Plus, Coffee, Clock, Settings, Edit3, Trash2, ChevronLeft, ChevronRight, Tags, Boxes, Download, FileText, Sparkles, Loader2, History, RotateCcw } from 'lucide-react';
import { downloadFile } from '../utils';

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
  lunchRule, onUpdateLunchRule, isOpen, onToggle,
  onExportCSV, onExportPDF, onAiGenerate, isAiGenerating,
  history, onTakeSnapshot, onRestoreSnapshot, onDeleteSnapshot
}) => {
  const [activeTab, setActiveTab] = useState<'templates' | 'history' | 'ai' | 'categories' | 'resources' | 'rules'>('templates');
  const [editingProfile, setEditingProfile] = useState<ProfileBlock | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);

  const isMobile = window.innerWidth < 1024;

  if (!isOpen && !isMobile) {
    return (
      <div className="hidden lg:flex w-full sidebar-container bg-white dark:bg-dark-surface border-r dark:border-dark-border flex-col items-center py-4 gap-6 h-full transition-all shrink-0">
        <button onClick={onToggle} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500"><ChevronRight size={20} /></button>
        <button onClick={() => {onToggle(); setActiveTab('templates');}} className="p-2 text-indigo-600" title="Templates"><Clock size={20} /></button>
        <button onClick={() => {onToggle(); setActiveTab('history');}} className="p-2 text-slate-500" title="History"><History size={20} /></button>
        <button onClick={() => {onToggle(); setActiveTab('ai');}} className="p-2 text-purple-600" title="AI Studio"><Sparkles size={20} /></button>
        <button onClick={() => {onToggle(); setActiveTab('categories');}} className="p-2 text-blue-500" title="Categories"><Tags size={20} /></button>
        <button onClick={() => {onToggle(); setActiveTab('resources');}} className="p-2 text-emerald-500" title="Resources"><Boxes size={20} /></button>
      </div>
    );
  }

  const inputClasses = "w-full text-sm p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800 dark:text-slate-200";
  const colorOptions = Object.keys(COLOR_MAP);

  return (
    <div className="w-full sidebar-container flex flex-col bg-white dark:bg-dark-surface h-full overflow-hidden transition-all shrink-0 z-50">
      <div className="p-4 border-b dark:border-dark-border flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
        <div className="flex gap-1 overflow-x-auto no-scrollbar">
          {['templates', 'history', 'ai', 'categories', 'resources', 'rules'].map((tab) => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab as any)} 
              className={`p-2 rounded-lg transition-colors shrink-0 ${activeTab === tab ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800'}`}
              title={tab.charAt(0).toUpperCase() + tab.slice(1)}
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
              <button onClick={() => setEditingProfile({ id: Math.random().toString(36).substr(2, 9), name: '', categoryId: categories[0]?.id || '', defaultDuration: 60, color: 'blue', resourceIds: [] })} className="p-1 hover:bg-indigo-50 text-indigo-600 rounded" title="Add Template"><Plus size={16} /></button>
            </div>
            {profiles.map((p) => (
              <div key={p.id} draggable onDragStart={(e) => { e.dataTransfer.setData('application/json', JSON.stringify(p)); }} className="group relative">
                <button onClick={() => onAddBlockFromProfile(p)} className="w-full text-left p-2.5 rounded-lg border dark:border-slate-800 hover:border-indigo-200 transition-all flex items-center gap-3">
                  <div className={`w-1.5 h-6 rounded-full ${COLOR_MAP[categories.find(c => c.id === p.categoryId)?.color || 'slate']?.split(' ')[0]}`}></div>
                  <div className="flex-1 truncate">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{p.name || 'Untitled'}</p>
                    <p className="text-[9px] text-slate-400">{p.defaultDuration}m</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setEditingProfile(p); }} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 transition-opacity"><Edit3 size={12} /></button>
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">History</h3>
              <button onClick={() => onTakeSnapshot()} className="p-1 px-2 text-[9px] font-bold bg-indigo-50 text-indigo-600 rounded border border-indigo-100">Take Now</button>
            </div>
            {history.length === 0 ? (
              <p className="text-center py-8 text-[10px] uppercase text-slate-400 font-bold tracking-widest">No milestones</p>
            ) : history.map((s) => (
              <div key={s.id} className="p-3 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 rounded-xl group">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate pr-2">{s.name}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onRestoreSnapshot(s)} className="p-1 text-indigo-600 hover:bg-white dark:hover:bg-slate-800 rounded"><RotateCcw size={12} /></button>
                    <button onClick={() => onDeleteSnapshot(s.id)} className="p-1 text-red-600 hover:bg-white dark:hover:bg-slate-800 rounded"><Trash2 size={12} /></button>
                  </div>
                </div>
                <div className="text-[9px] text-slate-400">
                  {new Date(s.timestamp).toLocaleTimeString()} • {s.blocks.length} items
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="space-y-6">
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-2xl text-center">
               <Sparkles className="mx-auto mb-3 text-purple-600" size={24} />
               <p className="text-xs text-purple-700 dark:text-purple-300 mb-4 leading-relaxed font-medium">Synthesize an optimized weekly production plan.</p>
               <button onClick={onAiGenerate} disabled={isAiGenerating} className={`w-full py-4 rounded-xl flex items-center justify-center gap-3 font-bold text-sm transition-all shadow-lg ${isAiGenerating ? 'bg-slate-200 cursor-not-allowed text-slate-500' : 'bg-purple-600 text-white hover:bg-purple-700 shadow-purple-500/20'}`}>
                  {isAiGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                  {isAiGenerating ? 'Analyzing...' : 'Generate Weekly Plan'}
               </button>
            </div>
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Category Library</h3>
              <button onClick={() => setEditingCategory({ id: Math.random().toString(36).substr(2, 9), name: '', color: 'blue' })} className="p-1 hover:bg-blue-50 text-blue-600 rounded"><Plus size={16} /></button>
            </div>
            {categories.map((c) => (
              <div key={c.id} className="p-3 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 rounded-xl flex items-center justify-between group">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`w-3 h-3 rounded-full shrink-0 ${COLOR_MAP[c.color]?.split(' ')[0]}`}></div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{c.name}</span>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setEditingCategory(c)} className="p-1 text-slate-400 hover:text-blue-600"><Edit3 size={12} /></button>
                  <button onClick={() => onUpdateCategories(categories.filter(cat => cat.id !== c.id))} className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'resources' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Equipment List</h3>
              <button onClick={() => setEditingResource({ id: Math.random().toString(36).substr(2, 9), name: '', description: '' })} className="p-1 hover:bg-emerald-50 text-emerald-600 rounded"><Plus size={16} /></button>
            </div>
            {resources.map((r) => (
              <div key={r.id} className="p-3 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 rounded-xl group">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate pr-2">{r.name}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditingResource(r)} className="p-1 text-slate-400 hover:text-emerald-600"><Edit3 size={12} /></button>
                    <button onClick={() => onUpdateResources(resources.filter(res => res.id !== r.id))} className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={12} /></button>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 truncate">{r.description || 'No description'}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'rules' && (
          <div className="space-y-6">
             <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border dark:border-slate-800">
                <div className="flex items-center justify-between mb-2">
                   <div className="flex items-center gap-2"><Coffee size={14} className="text-amber-600" /><label className="text-xs font-bold text-slate-600 dark:text-slate-300">Lunch Break Window</label></div>
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
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Tools</h3>
                <div className="grid grid-cols-1 gap-2">
                   <button onClick={onExportPDF} className="flex items-center justify-center gap-2 p-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold border dark:border-slate-700 shadow-sm"><FileText size={14} /> Print to PDF</button>
                   <button onClick={onExportCSV} className="flex items-center justify-center gap-2 p-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold border dark:border-slate-700 shadow-sm"><Download size={14} /> Export CSV</button>
                </div>
             </div>
          </div>
        )}
      </div>

      {editingProfile && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4" onClick={() => setEditingProfile(null)}>
          <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
             <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Edit Template</h3>
             <div><InputLabel>Title</InputLabel><input className={inputClasses} value={editingProfile.name} onChange={e => setEditingProfile({...editingProfile, name: e.target.value})} /></div>
             <div className="flex gap-4">
                <div className="flex-1"><InputLabel>Category</InputLabel><select className={inputClasses} value={editingProfile.categoryId} onChange={e => setEditingProfile({...editingProfile, categoryId: e.target.value})}>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                <div className="w-24"><InputLabel>Min</InputLabel><input type="number" className={inputClasses} value={editingProfile.defaultDuration} onChange={e => setEditingProfile({...editingProfile, defaultDuration: parseInt(e.target.value)})}/></div>
             </div>
             <button onClick={() => { 
               if (!editingProfile) return;
               onUpdateProfiles(profiles.find(p => p.id === editingProfile.id) ? profiles.map(p => p.id === editingProfile.id ? editingProfile : p) : [...profiles, editingProfile]); 
               setEditingProfile(null); 
             }} className="w-full py-4 font-bold text-white bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/20">Save Template</button>
          </div>
        </div>
      )}

      {editingCategory && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4" onClick={() => setEditingCategory(null)}>
          <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
             <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Edit Category</h3>
             <div><InputLabel>Name</InputLabel><input className={inputClasses} value={editingCategory.name} onChange={e => setEditingCategory({...editingCategory, name: e.target.value})} /></div>
             <div>
               <InputLabel>Color Profile</InputLabel>
               <div className="grid grid-cols-5 gap-2 mt-2">
                 {colorOptions.map(color => (
                   <button 
                    key={color} 
                    onClick={() => setEditingCategory({...editingCategory, color})}
                    className={`w-full aspect-square rounded-lg border-2 transition-all ${COLOR_MAP[color]?.split(' ')[0]} ${editingCategory.color === color ? 'border-indigo-600 scale-110 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'}`}
                   />
                 ))}
               </div>
             </div>
             <button onClick={() => { 
               if (!editingCategory) return;
               onUpdateCategories(categories.find(c => c.id === editingCategory.id) ? categories.map(c => c.id === editingCategory.id ? editingCategory : c) : [...categories, editingCategory]); 
               setEditingCategory(null); 
             }} className="w-full py-4 font-bold text-white bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/20">Update Category</button>
          </div>
        </div>
      )}

      {editingResource && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4" onClick={() => setEditingResource(null)}>
          <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
             <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Edit Resource</h3>
             <div><InputLabel>Name</InputLabel><input className={inputClasses} value={editingResource.name} onChange={e => setEditingResource({...editingResource, name: e.target.value})} /></div>
             <div><InputLabel>Description</InputLabel><textarea className={`${inputClasses} h-24 resize-none`} value={editingResource.description} onChange={e => setEditingResource({...editingResource, description: e.target.value})} /></div>
             <button onClick={() => { 
               if (!editingResource) return;
               onUpdateResources(resources.find(r => r.id === editingResource.id) ? resources.map(r => r.id === editingResource.id ? editingResource : r) : [...resources, editingResource]); 
               setEditingResource(null); 
             }} className="w-full py-4 font-bold text-white bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/20">Save Resource</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;

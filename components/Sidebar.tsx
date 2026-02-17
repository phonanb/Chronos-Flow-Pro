
import React, { useState, useRef } from 'react';
import { ProfileBlock, Category, Resource, LunchBreakRule, EveningBreakRule } from '../types';
import { COLOR_MAP } from '../constants';
import { Plus, Coffee, Clock, Settings, Edit3, Trash2, X, ChevronLeft, ChevronRight, Tags, Boxes, GripVertical, Download, Upload, FileText, Moon } from 'lucide-react';
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
}

const Sidebar: React.FC<SidebarProps> = ({ 
  profiles, categories, resources, 
  onAddBlockFromProfile, onUpdateProfiles, onUpdateCategories, onUpdateResources,
  lunchRule, onUpdateLunchRule, eveningRule, onUpdateEveningRule, isOpen, onToggle,
  onExportCFP, onImportCFP, onExportCSV, onExportPDF
}) => {
  const [activeTab, setActiveTab] = useState<'templates' | 'categories' | 'resources' | 'rules'>('templates');
  const [editingProfile, setEditingProfile] = useState<ProfileBlock | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isMobile = window.innerWidth < 1024;

  const handleDragStart = (idx: number) => setDraggedIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
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
        <button onClick={() => {onToggle(); setActiveTab('templates');}} className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg"><Clock size={20} /></button>
        <button onClick={() => {onToggle(); setActiveTab('categories');}} className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg"><Tags size={20} /></button>
        <button onClick={() => {onToggle(); setActiveTab('resources');}} className="p-2 hover:bg-amber-50 dark:hover:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg"><Boxes size={20} /></button>
      </div>
    );
  }

  const inputClasses = "w-full text-sm p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800 dark:text-slate-200";

  return (
    <div className="w-full sidebar-container flex flex-col bg-white dark:bg-dark-surface h-full overflow-hidden transition-all shrink-0 z-50">
      <div className="p-4 border-b dark:border-dark-border flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
        <div className="flex gap-1">
          {['templates', 'categories', 'resources', 'rules'].map((tab) => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab as any)} 
              title={`Switch to ${tab}`}
              className={`p-2 rounded-lg transition-colors ${activeTab === tab ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800'}`}
            >
              {tab === 'templates' && <Clock size={18} />}
              {tab === 'categories' && <Tags size={18} />}
              {tab === 'resources' && <Boxes size={18} />}
              {tab === 'rules' && <Settings size={18} />}
            </button>
          ))}
        </div>
        {!isMobile && <button onClick={onToggle} title="Collapse Library" className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500"><ChevronLeft size={18} /></button>}
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {activeTab === 'templates' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Quick Templates</h3>
              <button onClick={() => setEditingProfile({ id: Math.random().toString(36).substr(2, 9), name: '', categoryId: categories[0]?.id || '', defaultDuration: 60, color: 'blue', resourceIds: [] })} title="Create Template" className="p-1 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded"><Plus size={16} /></button>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {profiles.map((p, idx) => (
                <div 
                  key={p.id} 
                  draggable 
                  onDragStart={() => handleDragStart(idx)} 
                  onDragOver={(e) => handleDragOver(e, idx)} 
                  className="group relative"
                >
                  <button onClick={() => onAddBlockFromProfile(p)} className="w-full text-left p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-all flex items-center gap-3">
                    <div className={`w-1.5 h-6 rounded-full ${COLOR_MAP[categories.find(c => c.id === p.categoryId)?.color || 'slate']?.split(' ')[0]}`}></div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{p.name || 'Untitled'}</p>
                      <p className="text-[9px] text-slate-400 dark:text-slate-500">{p.defaultDuration}m • {categories.find(c => c.id === p.categoryId)?.name}</p>
                    </div>
                    <GripVertical size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing hidden lg:block" />
                  </button>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 bg-white/95 dark:bg-slate-900/95 p-1 rounded shadow-sm border dark:border-slate-700 transition-opacity">
                     <button onClick={(e) => { e.stopPropagation(); setEditingProfile(p); }} className="p-1 text-slate-500 hover:text-indigo-600"><Edit3 size={12} /></button>
                     <button onClick={(e) => { e.stopPropagation(); onUpdateProfiles(profiles.filter(op => op.id !== p.id)); }} className="p-1 text-slate-500 hover:text-red-600"><Trash2 size={12} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Categories</h3>
              <button onClick={() => setEditingCategory({ id: Math.random().toString(36).substr(2, 9), name: '', color: 'blue' })} title="Add Category" className="p-1 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded"><Plus size={16} /></button>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {categories.map((c, idx) => (
                <div 
                  key={c.id} 
                  draggable 
                  onDragStart={() => handleDragStart(idx)} 
                  onDragOver={(e) => handleDragOver(e, idx)} 
                  className="flex items-center justify-between p-2.5 border dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 group"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${COLOR_MAP[c.color]?.split(' ')[0]}`}></div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{c.name}</span>
                  </div>
                  <div className="flex gap-1 items-center">
                    <button onClick={() => setEditingCategory(c)} className="p-1 text-slate-400 hover:text-emerald-600"><Edit3 size={12} /></button>
                    <button onClick={() => onUpdateCategories(categories.filter(oc => oc.id !== c.id))} className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={12} /></button>
                    <GripVertical size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 cursor-grab hidden lg:block" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'resources' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Equipment Pool</h3>
              <button onClick={() => setEditingResource({ id: Math.random().toString(36).substr(2, 9), name: '', description: '' })} title="Register Equipment" className="p-1 hover:bg-amber-50 dark:hover:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded"><Plus size={16} /></button>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {resources.map((r, idx) => (
                <div 
                  key={r.id} 
                  draggable 
                  onDragStart={() => handleDragStart(idx)} 
                  onDragOver={(e) => handleDragOver(e, idx)} 
                  className="p-2.5 border dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 group relative"
                >
                  <div className="flex items-center justify-between mb-1">
                     <div className="flex items-center gap-2">
                       <Boxes size={12} className="text-amber-500" />
                       <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{r.name}</span>
                     </div>
                     <div className="flex gap-1 items-center">
                       <button onClick={() => setEditingResource(r)} className="p-1 text-slate-400 hover:text-amber-600"><Edit3 size={12} /></button>
                       <button onClick={() => onUpdateResources(resources.filter(or => or.id !== r.id))} className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={12} /></button>
                       <GripVertical size={14} className="text-slate-300 cursor-grab hidden lg:block" />
                     </div>
                  </div>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 truncate">{r.description || 'No notes'}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'rules' && (
          <div className="space-y-6">
             <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border dark:border-slate-800">
                <div className="flex items-center justify-between mb-2">
                   <div className="flex items-center gap-2"><Coffee size={14} className="text-amber-600" /><label className="text-xs font-bold text-slate-600 dark:text-slate-300">Lunch Break</label></div>
                   <input type="checkbox" checked={lunchRule.enabled} onChange={(e) => onUpdateLunchRule({ ...lunchRule, enabled: e.target.checked })} className="w-4 h-4 rounded bg-white dark:bg-slate-900 border dark:border-slate-700 text-indigo-600" />
                </div>
                {lunchRule.enabled && (
                  <div className="space-y-3 mt-4">
                     <div>
                       <InputLabel>Start Time</InputLabel>
                       <div className="flex items-center gap-3">
                         <input type="number" step="15" className={inputClasses} value={lunchRule.startTime} onChange={(e) => onUpdateLunchRule({...lunchRule, startTime: parseInt(e.target.value)})}/>
                         <span className="text-[9px] whitespace-nowrap text-slate-400">{formatTime(lunchRule.startTime)}</span>
                       </div>
                     </div>
                     <div>
                       <InputLabel>End Time</InputLabel>
                       <div className="flex items-center gap-3">
                         <input type="number" step="15" className={inputClasses} value={lunchRule.endTime} onChange={(e) => onUpdateLunchRule({...lunchRule, endTime: parseInt(e.target.value)})}/>
                         <span className="text-[9px] whitespace-nowrap text-slate-400">{formatTime(lunchRule.endTime)}</span>
                       </div>
                     </div>
                  </div>
                )}
             </div>

             <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border dark:border-slate-800">
                <div className="flex items-center justify-between mb-2">
                   <div className="flex items-center gap-2"><Moon size={14} className="text-indigo-600" /><label className="text-xs font-bold text-slate-600 dark:text-slate-300">Evening Break</label></div>
                   <input type="checkbox" checked={eveningRule.enabled} onChange={(e) => onUpdateEveningRule({ ...eveningRule, enabled: e.target.checked })} className="w-4 h-4 rounded bg-white dark:bg-slate-900 border dark:border-slate-700 text-indigo-600" />
                </div>
                {eveningRule.enabled && (
                  <div className="space-y-3 mt-4">
                     <div>
                       <InputLabel>Start Time</InputLabel>
                       <div className="flex items-center gap-3">
                         <input type="number" step="15" className={inputClasses} value={eveningRule.startTime} onChange={(e) => onUpdateEveningRule({...eveningRule, startTime: parseInt(e.target.value)})}/>
                         <span className="text-[9px] whitespace-nowrap text-slate-400">{formatTime(eveningRule.startTime)}</span>
                       </div>
                     </div>
                     <div>
                       <InputLabel>End Time</InputLabel>
                       <div className="flex items-center gap-3">
                         <input type="number" step="15" className={inputClasses} value={eveningRule.endTime} onChange={(e) => onUpdateEveningRule({...eveningRule, endTime: parseInt(e.target.value)})}/>
                         <span className="text-[9px] whitespace-nowrap text-slate-400">{formatTime(eveningRule.endTime)}</span>
                       </div>
                     </div>
                  </div>
                )}
             </div>

             <div className="space-y-3">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Project Management</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
                   <button onClick={onExportCFP} className="flex items-center justify-center gap-2 p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold border border-indigo-100 dark:border-indigo-900/50 hover:bg-indigo-100 transition-colors">
                     <Download size={14} /> Export .CFP
                   </button>
                   <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-colors">
                     <Upload size={14} /> Import .CFP
                   </button>
                   <input 
                     type="file" 
                     ref={fileInputRef} 
                     className="hidden" 
                     accept=".cfp" 
                     onChange={(e) => e.target.files && onImportCFP(e.target.files[0])}
                   />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
                   <button onClick={onExportCSV} className="flex items-center justify-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-bold border border-emerald-100 dark:border-emerald-900/50 hover:bg-emerald-100 transition-colors">
                     <FileText size={14} /> CSV Report
                   </button>
                   <button onClick={onExportPDF} className="flex items-center justify-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-xs font-bold border border-red-100 dark:border-red-900/50 hover:bg-red-100 transition-colors">
                     <FileText size={14} /> Print PDF
                   </button>
                </div>
             </div>
          </div>
        )}
      </div>

      {editingProfile && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4" onClick={() => setEditingProfile(null)}>
          <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 border dark:border-slate-700" onClick={e => e.stopPropagation()}>
             <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Template Setup</h3>
                <button onClick={() => setEditingProfile(null)}><X size={18} className="text-slate-400" /></button>
             </div>
             
             <div>
                <InputLabel>Title</InputLabel>
                <input className={inputClasses} value={editingProfile.name} onChange={e => setEditingProfile({...editingProfile, name: e.target.value})} />
             </div>

             <div className="flex gap-4">
                <div className="flex-1">
                   <InputLabel>Category</InputLabel>
                   <select className={inputClasses} value={editingProfile.categoryId} onChange={e => setEditingProfile({...editingProfile, categoryId: e.target.value})}>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </select>
                </div>
                <div className="w-24">
                   <InputLabel>Min</InputLabel>
                   <input type="number" className={inputClasses} value={editingProfile.defaultDuration} onChange={e => setEditingProfile({...editingProfile, defaultDuration: parseInt(e.target.value)})}/>
                </div>
             </div>

             <div>
                <InputLabel>Resources</InputLabel>
                <div className="max-h-32 overflow-y-auto custom-scrollbar space-y-1 p-1 border dark:border-slate-800 rounded-lg">
                   {resources.map(r => (
                     <label key={r.id} className="flex items-center gap-2 text-xs p-1.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 rounded">
                        <input type="checkbox" checked={editingProfile.resourceIds.includes(r.id)} onChange={e => {
                          const ids = e.target.checked ? [...editingProfile.resourceIds, r.id] : editingProfile.resourceIds.filter(id => id !== r.id);
                          setEditingProfile({...editingProfile, resourceIds: ids});
                        }} className="rounded" />
                        <span className="text-slate-700 dark:text-slate-300">{r.name}</span>
                     </label>
                   ))}
                </div>
             </div>

             <button onClick={() => {
                onUpdateProfiles(profiles.find(p => p.id === editingProfile.id) ? profiles.map(p => p.id === editingProfile.id ? editingProfile : p) : [...profiles, editingProfile]);
                setEditingProfile(null);
             }} className="w-full py-3 text-sm font-bold text-white bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/20">Apply Changes</button>
          </div>
        </div>
      )}

      {editingCategory && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4" onClick={() => setEditingCategory(null)}>
          <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 border dark:border-slate-700" onClick={e => e.stopPropagation()}>
             <div className="flex justify-between items-center"><h3 className="font-bold text-slate-800 dark:text-slate-100">Category Config</h3><button onClick={() => setEditingCategory(null)}><X size={18} /></button></div>
             <div>
                <InputLabel>Name</InputLabel>
                <input className={inputClasses} value={editingCategory.name} onChange={e => setEditingCategory({...editingCategory, name: e.target.value})} />
             </div>
             <div className="flex flex-wrap gap-2">
                {Object.keys(COLOR_MAP).map(color => (
                  <button key={color} onClick={() => setEditingCategory({...editingCategory, color})} className={`w-8 h-8 rounded-full border-2 ${COLOR_MAP[color].split(' ')[0]} ${editingCategory.color === color ? 'border-indigo-600' : 'border-transparent'}`} />
                ))}
             </div>
             <button onClick={() => {
               onUpdateCategories(categories.find(c => c.id === editingCategory.id) ? categories.map(c => c.id === editingCategory.id ? editingCategory : c) : [...categories, editingCategory]);
               setEditingCategory(null);
             }} className="w-full py-3 text-sm font-bold text-white bg-emerald-600 rounded-xl">Update</button>
          </div>
        </div>
      )}

      {editingResource && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4" onClick={() => setEditingResource(null)}>
          <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 border dark:border-slate-700" onClick={e => e.stopPropagation()}>
             <div className="flex justify-between items-center"><h3 className="font-bold text-slate-800 dark:text-slate-100">Resource Config</h3><button onClick={() => setEditingResource(null)}><X size={18} /></button></div>
             <div>
                <InputLabel>Name</InputLabel>
                <input className={inputClasses} value={editingResource.name} onChange={e => setEditingResource({...editingResource, name: e.target.value})} />
             </div>
             <div>
                <InputLabel>Notes</InputLabel>
                <textarea className={`${inputClasses} h-20`} value={editingResource.description} onChange={e => setEditingResource({...editingResource, description: e.target.value})} />
             </div>
             <button onClick={() => {
               onUpdateResources(resources.find(r => r.id === editingResource.id) ? resources.map(r => r.id === editingResource.id ? editingResource : r) : [...resources, editingResource]);
               setEditingResource(null);
             }} className="w-full py-3 text-sm font-bold text-white bg-amber-600 rounded-xl">Save</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;

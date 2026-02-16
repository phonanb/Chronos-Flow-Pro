
import React from 'react';
import { TimeBlock, Category, Resource } from '../types';
import { Link, CheckCircle2, X, ArrowDown, ChevronRight, ChevronLeft, Boxes, Clock } from 'lucide-react';

interface DetailPanelProps {
  block: TimeBlock | null;
  allBlocks: TimeBlock[];
  categories: Category[];
  resources: Resource[];
  onUpdate: (block: TimeBlock) => void;
  onClose: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

const DetailPanel: React.FC<DetailPanelProps> = ({ block, allBlocks, categories, resources, onUpdate, onClose, isOpen, onToggle }) => {
  if (!isOpen) {
    return (
      <div className="hidden lg:flex w-12 detail-panel-container bg-white dark:bg-dark-surface border dark:border-dark-border rounded-xl flex-col items-center py-4 h-full transition-all">
        <button onClick={onToggle} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 mb-6"><ChevronLeft size={20} /></button>
        {block && <div className="w-2 h-8 rounded bg-blue-500"></div>}
      </div>
    );
  }

  if (!block) return (
    <div className="w-full lg:w-80 h-full bg-white dark:bg-dark-surface border dark:border-dark-border rounded-xl flex flex-col items-center justify-center text-center p-8 text-slate-400 dark:text-slate-600 relative detail-panel-container shadow-lg lg:shadow-sm">
      <button onClick={onToggle} className="absolute top-4 left-4 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"><ChevronRight size={18} /></button>
      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-full mb-4"><CheckCircle2 size={32} /></div>
      <p className="font-semibold text-sm uppercase tracking-tight">Select a task unit to configure</p>
    </div>
  );

  const availableBlocks = allBlocks.filter(b => b.id !== block.id);
  const successors = allBlocks.filter(b => b.dependencies.includes(block.id));

  const handleToggleResource = (resId: string) => {
    const ids = block.resourceIds.includes(resId) 
      ? block.resourceIds.filter(id => id !== resId)
      : [...block.resourceIds, resId];
    onUpdate({ ...block, resourceIds: ids });
  };

  return (
    <div className="w-full lg:w-80 h-full bg-white dark:bg-dark-surface border dark:border-dark-border rounded-xl shadow-lg lg:shadow-sm flex flex-col overflow-hidden transition-all detail-panel-container z-50">
      <div className="p-4 border-b dark:border-dark-border flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
        <button onClick={onToggle} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500"><ChevronRight size={18} /></button>
        <h2 className="font-bold text-slate-800 dark:text-slate-100 truncate px-2 uppercase tracking-tight text-[10px]">{block.title || 'Unit Config'}</h2>
        <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500"><X size={18} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 lg:p-5 space-y-6 custom-scrollbar">
        <section>
          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2 tracking-widest">Definition</label>
          <input className="w-full text-sm font-semibold p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg mb-3 outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-100" placeholder="Block name" value={block.title} onChange={(e) => onUpdate({ ...block, title: e.target.value })} />
          
          <div className="flex items-center gap-3 mb-3">
             <div className="flex-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Duration (m)</label>
                <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                   <Clock size={12} className="text-slate-400" />
                   <input type="number" min="1" step="1" className="w-full bg-transparent text-xs font-bold outline-none text-slate-700 dark:text-slate-200" value={block.duration} onChange={(e) => onUpdate({...block, duration: parseInt(e.target.value) || 1})} />
                </div>
             </div>
             <div className="flex-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Category</label>
                <select className="w-full text-[10px] p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-slate-800 dark:text-slate-100" value={block.categoryId} onChange={(e) => onUpdate({ ...block, categoryId: e.target.value })}>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
             </div>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-2">
            <Boxes size={14} className="text-amber-500" />
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Equipment Pool</label>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
             {resources.map(r => (
               <label key={r.id} className={`flex items-center gap-2 p-2 rounded-lg border dark:border-slate-800 cursor-pointer transition-colors ${block.resourceIds.includes(r.id) ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900' : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-100'}`}>
                  <input type="checkbox" checked={block.resourceIds.includes(r.id)} onChange={() => handleToggleResource(r.id)} className="w-3 h-3 text-amber-500 rounded bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700" />
                  <span className="text-[9px] font-bold text-slate-700 dark:text-slate-300 truncate">{r.name}</span>
               </label>
             ))}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-2">
            <Link size={14} className="text-slate-400" />
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dependencies</label>
          </div>
          <div className="max-h-32 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg p-2 space-y-1 bg-white dark:bg-slate-900/50">
            {availableBlocks.map(other => (
              <label key={other.id} className="flex items-center gap-2 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 p-1 rounded-md">
                <input type="checkbox" checked={block.dependencies.includes(other.id)} onChange={() => onUpdate({ ...block, dependencies: block.dependencies.includes(other.id) ? block.dependencies.filter(d => d !== other.id) : [...block.dependencies, other.id] })} className="rounded text-blue-500 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700" />
                <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400 truncate">{other.title || 'Untitled'}</span>
              </label>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-2">
            <ArrowDown size={14} className="text-slate-400" />
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Impacted Successors</label>
          </div>
          <div className="space-y-1">
            {successors.map(s => (
              <div key={s.id} className="flex items-center gap-2 p-1 bg-white dark:bg-slate-800 rounded border border-slate-100 dark:border-slate-700">
                <div className="w-1 h-1 rounded-full bg-slate-400"></div>
                <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400 truncate">{s.title || 'Untitled'}</span>
              </div>
            ))}
            {successors.length === 0 && <p className="text-[9px] text-slate-500 italic">No successors</p>}
          </div>
        </section>
      </div>

      <div className="p-4 border-t dark:border-dark-border bg-slate-50/50 dark:bg-slate-800/20 flex justify-between items-center">
          <button onClick={() => onUpdate({...block, isLocked: !block.isLocked})} className="text-[10px] font-bold text-blue-600 dark:text-blue-400 px-4 py-2 border dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 shadow-sm hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors uppercase tracking-widest w-full">
            {block.isLocked ? 'Unlock Unit' : 'Lock Position'}
          </button>
      </div>
    </div>
  );
};

export default DetailPanel;

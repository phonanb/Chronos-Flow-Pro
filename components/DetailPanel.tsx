
import React from 'react';
import { TimeBlock, Category, Resource } from '../types';
import { Link, CheckCircle2, X, ArrowDown, ChevronRight, ChevronLeft, Boxes, Clock, Layout, Hash, Tags, Copy, Trash2 } from 'lucide-react';
import { formatTime } from '../utils';

interface DetailPanelProps {
  blocks: TimeBlock[];
  allBlocks: TimeBlock[];
  categories: Category[];
  resources: Resource[];
  onUpdate: (block: TimeBlock) => void;
  onClose: () => void;
  isOpen: boolean;
  onToggle: () => void;
  onDeleteSelected: () => void;
  onDuplicateSelected: () => void;
}

const SectionLabel: React.FC<{ children: React.ReactNode; icon?: React.ElementType }> = ({ children, icon: Icon }) => (
  <div className="flex items-center gap-2 mb-3">
    {Icon && <Icon size={14} className="text-slate-400" />}
    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em]">
      {children}
    </label>
  </div>
);

const DetailPanel: React.FC<DetailPanelProps> = ({ blocks, allBlocks, categories, resources, onUpdate, onClose, isOpen, onToggle, onDeleteSelected, onDuplicateSelected }) => {
  const isMobile = window.innerWidth < 1024;
  const isMulti = blocks.length > 1;
  const block = blocks.length === 1 ? blocks[0] : null;

  if (!isOpen && !isMobile) {
    return (
      <div className="hidden lg:flex w-full h-full bg-white dark:bg-dark-surface border dark:border-dark-border rounded-3xl flex-col items-center py-6 gap-8 shadow-sm">
        <button onClick={onToggle} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500"><ChevronLeft size={20} /></button>
        <div className="flex flex-col items-center gap-6 opacity-40">
           <Layout size={18} />
           <Boxes size={18} />
           <Link size={18} />
        </div>
      </div>
    );
  }

  if (blocks.length === 0) return (
    <div className="w-full h-full bg-white dark:bg-dark-surface flex flex-col items-center justify-center text-center p-8 text-slate-400 relative">
      {!isMobile && <button onClick={onToggle} className="absolute top-6 left-6 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"><ChevronRight size={18} /></button>}
      <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-full mb-6 border dark:border-slate-800"><CheckCircle2 size={40} className="text-slate-200 dark:text-slate-700" /></div>
      <p className="font-bold text-xs uppercase tracking-widest leading-loose">Select a system unit<br/>to begin configuration</p>
    </div>
  );

  const availableBlocks = allBlocks.filter(b => block && b.id !== block.id);
  const successors = block ? allBlocks.filter(b => b.dependencies.includes(block.id)) : [];

  return (
    <div className="w-full h-full bg-white dark:bg-dark-surface flex flex-col overflow-hidden">
      <div className="p-4 border-b dark:border-dark-border flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
        <div className="flex items-center gap-3">
           {!isMobile && <button onClick={onToggle} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl text-slate-500 transition-colors"><ChevronRight size={18} /></button>}
           <h2 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tighter text-sm">
             {isMulti ? `Batch Config (${blocks.length})` : 'Unit Inspector'}
           </h2>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl text-slate-400 hover:text-red-500 transition-colors"><X size={18} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-8 custom-scrollbar">
        {isMulti ? (
          <div className="space-y-6">
            <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/50 text-center">
               <div className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/20">
                  <Layout size={24} />
               </div>
               <h3 className="font-bold text-slate-800 dark:text-white mb-1">Bulk Operations</h3>
               <p className="text-xs text-slate-500 dark:text-slate-400">Apply actions to all {blocks.length} selected units.</p>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
               <button onClick={onDuplicateSelected} className="flex items-center justify-center gap-3 p-4 bg-white dark:bg-slate-800 border-2 border-indigo-100 dark:border-indigo-900/30 rounded-2xl text-indigo-600 font-bold text-sm hover:bg-indigo-50 transition-all">
                  <Copy size={18} /> Duplicate Selection
               </button>
               <button onClick={onDeleteSelected} className="flex items-center justify-center gap-3 p-4 bg-white dark:bg-slate-800 border-2 border-red-100 dark:border-red-900/30 rounded-2xl text-red-500 font-bold text-sm hover:bg-red-50 transition-all">
                  <Trash2 size={18} /> Delete Selected Items
               </button>
            </div>

            <div className="space-y-2">
               <SectionLabel icon={Layout}>Selected Units</SectionLabel>
               <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                  {blocks.map(b => (
                    <div key={b.id} className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border dark:border-slate-800 flex justify-between items-center">
                       <span className="text-xs font-bold truncate pr-4">{b.title}</span>
                       <span className="text-[10px] text-slate-400 font-mono">{formatTime(b.startTime)}</span>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        ) : block && (
          <>
            <section>
              <SectionLabel icon={Layout}>General Definition</SectionLabel>
              <div className="space-y-4">
                 <div>
                    <input className="w-full text-base font-bold p-3 bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 dark:text-slate-100" placeholder="System Unit Name" value={block.title} onChange={(e) => onUpdate({ ...block, title: e.target.value })} />
                 </div>

                 <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border dark:border-slate-700">
                    <SectionLabel icon={Tags}>Category Assignment</SectionLabel>
                    <select 
                      className="w-full bg-transparent text-sm font-bold outline-none text-slate-800 dark:text-slate-100 appearance-none cursor-pointer" 
                      value={block.categoryId} 
                      onChange={(e) => onUpdate({ ...block, categoryId: e.target.value })}
                    >
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id} className="dark:bg-slate-900">{cat.name}</option>
                      ))}
                    </select>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border dark:border-slate-700">
                       <SectionLabel icon={Clock}>Start Time (m)</SectionLabel>
                       <input type="number" min="0" className="w-full bg-transparent text-sm font-bold outline-none text-slate-800 dark:text-slate-100" value={block.startTime} onChange={(e) => onUpdate({...block, startTime: parseInt(e.target.value) || 0})} />
                       <div className="mt-1 text-[9px] font-bold text-indigo-500 uppercase tracking-wider">{formatTime(block.startTime)}</div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border dark:border-slate-700">
                       <SectionLabel icon={Clock}>Duration (m)</SectionLabel>
                       <input type="number" min="1" className="w-full bg-transparent text-sm font-bold outline-none text-slate-800 dark:text-slate-100" value={block.duration} onChange={(e) => onUpdate({...block, duration: parseInt(e.target.value) || 1})} />
                       <div className="mt-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">{Math.floor(block.duration / 60)}h {block.duration % 60}m</div>
                    </div>
                    <div className="col-span-2 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border dark:border-slate-700">
                       <SectionLabel icon={Hash}>System Lane</SectionLabel>
                       <input type="number" min="0" className="w-full bg-transparent text-sm font-bold outline-none text-slate-800 dark:text-slate-100" value={block.lane} onChange={(e) => onUpdate({...block, lane: parseInt(e.target.value) || 0})} />
                    </div>
                 </div>
              </div>
            </section>

            <section>
              <SectionLabel icon={Boxes}>Required Equipment</SectionLabel>
              <div className="space-y-2">
                 {resources.length > 0 ? resources.map(r => (
                   <label key={r.id} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${block.resourceIds.includes(r.id) ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500/50 shadow-sm' : 'bg-slate-50 dark:bg-slate-900 border-transparent hover:border-slate-200 dark:hover:border-slate-700'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${block.resourceIds.includes(r.id) ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{r.name}</span>
                      </div>
                      <input type="checkbox" className="hidden" checked={block.resourceIds.includes(r.id)} onChange={() => onUpdate({...block, resourceIds: block.resourceIds.includes(r.id) ? block.resourceIds.filter(id => id !== r.id) : [...block.resourceIds, r.id]})} />
                      {block.resourceIds.includes(r.id) && <CheckCircle2 size={14} className="text-indigo-500" />}
                   </label>
                 )) : <p className="text-[10px] text-slate-500 italic">No resources defined</p>}
              </div>
            </section>

            <section>
              <SectionLabel icon={Link}>Dependency Logic</SectionLabel>
              <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border dark:border-slate-700 overflow-hidden">
                 <div className="max-h-48 overflow-y-auto custom-scrollbar p-2">
                    {availableBlocks.length > 0 ? availableBlocks.map(other => {
                      const otherCategory = categories.find(c => c.id === other.categoryId);
                      return (
                        <label key={other.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer group">
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${block.dependencies.includes(other.id) ? 'bg-indigo-600 border-indigo-600' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700'}`}>
                            {block.dependencies.includes(other.id) && <CheckCircle2 size={10} className="text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-slate-100 truncate">
                              {other.title || 'Untitled Unit'}
                            </div>
                            <div className="text-[9px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-tight">
                              {otherCategory?.name || 'No Category'}
                            </div>
                          </div>
                          <input type="checkbox" className="hidden" checked={block.dependencies.includes(other.id)} onChange={() => onUpdate({ ...block, dependencies: block.dependencies.includes(other.id) ? block.dependencies.filter(d => d !== other.id) : [...block.dependencies, other.id] })} />
                        </label>
                      );
                    }) : <p className="p-4 text-[10px] text-slate-500 text-center">No other units available</p>}
                 </div>
              </div>
            </section>

            <section>
              <SectionLabel icon={ArrowDown}>Downstream Impact</SectionLabel>
              <div className="space-y-2">
                {successors.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800/50 rounded-xl border dark:border-slate-700 border-dashed">
                    <span className="text-xs font-bold text-slate-400">{s.title || 'Untitled Unit'}</span>
                    <Link size={12} className="text-slate-300" />
                  </div>
                ))}
                {successors.length === 0 && <p className="text-[10px] text-slate-500 italic">No downstream units dependent on this one</p>}
              </div>
            </section>
          </>
        )}
      </div>

      <div className="p-4 lg:p-5 border-t dark:border-dark-border bg-slate-50/50 dark:bg-slate-800/20">
          {isMulti ? (
             <div className="grid grid-cols-2 gap-3">
                <button onClick={onDuplicateSelected} className="py-3 px-2 bg-indigo-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:scale-105 transition-all">
                  Copy All
                </button>
                <button onClick={onDeleteSelected} className="py-3 px-2 bg-red-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-red-500/20 hover:scale-105 transition-all">
                  Delete All
                </button>
             </div>
          ) : block && (
            <button onClick={() => onUpdate({...block, isLocked: !block.isLocked})} className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-[0.2em] transition-all shadow-lg ${block.isLocked ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 shadow-amber-500/10' : 'bg-indigo-600 text-white shadow-indigo-500/20 hover:scale-[1.02] active:scale-95'}`}>
              {block.isLocked ? 'Unlock Logic' : 'Lock Configuration'}
            </button>
          )}
      </div>
    </div>
  );
};

export default DetailPanel;

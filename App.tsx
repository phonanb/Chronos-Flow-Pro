
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TimeBlock, ProfileBlock, Category, Resource, LunchBreakRule, Orientation } from './types';
import Sidebar from './components/Sidebar';
import Timeline from './components/Timeline';
import DetailPanel from './components/DetailPanel';
import { START_HOUR, END_HOUR, INITIAL_PROFILES, INITIAL_CATEGORIES, INITIAL_RESOURCES } from './constants';
import { Layers, Moon, Sun, Monitor, Smartphone, ZoomIn, ZoomOut, Library, LayoutGrid, Settings2, RotateCcw, Plus } from 'lucide-react';
import { downloadFile, generateCSV } from './utils';

type MobileTab = 'sidebar' | 'timeline' | 'detail';

const App: React.FC = () => {
  const loadState = <T,>(key: string, defaultValue: T): T => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : defaultValue;
    } catch (e) {
      console.error(`Failed to load state for ${key}`, e);
      return defaultValue;
    }
  };

  const [blocks, setBlocks] = useState<TimeBlock[]>(() => loadState('cfp_blocks', []));
  const [profiles, setProfiles] = useState<ProfileBlock[]>(() => loadState('cfp_profiles', INITIAL_PROFILES));
  const [categories, setCategories] = useState<Category[]>(() => loadState('cfp_categories', INITIAL_CATEGORIES));
  const [resources, setResources] = useState<Resource[]>(() => loadState('cfp_resources', INITIAL_RESOURCES));
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [lunchRule, setLunchRule] = useState<LunchBreakRule>(() => loadState('cfp_lunchRule', { enabled: true, startTime: 720, endTime: 780 }));
  const [isDarkMode, setIsDarkMode] = useState(() => loadState('cfp_darkMode', true));
  const [orientation, setOrientation] = useState<Orientation>(() => loadState('cfp_orientation', 'landscape'));
  const [zoom, setZoom] = useState(() => loadState('cfp_zoom', 1.0));
  const [mobileTab, setMobileTab] = useState<MobileTab>('timeline');
  const [isCenterFullScreen, setIsCenterFullScreen] = useState(false);
  
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(window.innerWidth > 1024);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(window.innerWidth > 1280);

  // Responsive Widths
  const [leftWidth, setLeftWidth] = useState(() => loadState('cfp_leftWidth', 260));
  const [rightWidth, setRightWidth] = useState(() => loadState('cfp_rightWidth', 320));

  const resizingRef = useRef<'left' | 'right' | null>(null);

  useEffect(() => {
    localStorage.setItem('cfp_blocks', JSON.stringify(blocks));
    localStorage.setItem('cfp_profiles', JSON.stringify(profiles));
    localStorage.setItem('cfp_categories', JSON.stringify(categories));
    localStorage.setItem('cfp_resources', JSON.stringify(resources));
    localStorage.setItem('cfp_lunchRule', JSON.stringify(lunchRule));
    localStorage.setItem('cfp_darkMode', JSON.stringify(isDarkMode));
    localStorage.setItem('cfp_orientation', JSON.stringify(orientation));
    localStorage.setItem('cfp_zoom', JSON.stringify(zoom));
    localStorage.setItem('cfp_leftWidth', JSON.stringify(leftWidth));
    localStorage.setItem('cfp_rightWidth', JSON.stringify(rightWidth));
  }, [blocks, profiles, categories, resources, lunchRule, isDarkMode, orientation, zoom, leftWidth, rightWidth]);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  const handleResizerStart = useCallback((side: 'left' | 'right') => {
    if (window.innerWidth < 1024) return;
    resizingRef.current = side;
    document.body.style.cursor = 'col-resize';
    document.body.classList.add('no-scroll');
  }, []);

  const handleResizerMove = useCallback((clientX: number) => {
    if (!resizingRef.current) return;
    if (resizingRef.current === 'left') {
      const newWidth = Math.max(180, Math.min(clientX, 400));
      setLeftWidth(newWidth);
    } else {
      const newWidth = Math.max(240, Math.min(window.innerWidth - clientX, 480));
      setRightWidth(newWidth);
    }
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handleResizerMove(e.clientX);
    const onTouchMove = (e: TouchEvent) => {
      if (resizingRef.current) {
        if (e.cancelable) e.preventDefault();
        handleResizerMove(e.touches[0].clientX);
      }
    };
    const onEnd = () => {
      resizingRef.current = null;
      document.body.style.cursor = '';
      document.body.classList.remove('no-scroll');
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [handleResizerMove]);

  const handleAddBlockFromProfile = (profile: ProfileBlock) => {
    const newBlock: TimeBlock = {
      id: Math.random().toString(36).substr(2, 9),
      title: profile.name,
      originalTitle: profile.name,
      description: '',
      startTime: (START_HOUR + 1) * 60,
      duration: profile.defaultDuration,
      categoryId: profile.categoryId,
      dependencies: [],
      resourceIds: [...profile.resourceIds],
      prerequisites: [],
      color: profile.color,
      isLocked: false,
      lane: 0
    };
    setBlocks(prev => [...prev, newBlock]);
    setSelectedBlockId(newBlock.id);
    if (!isRightPanelOpen) setIsRightPanelOpen(true);
    if (window.innerWidth < 1024) setMobileTab('detail');
  };

  const handleUpdateBlock = (updatedBlock: TimeBlock) => {
    setBlocks(prev => prev.map(b => b.id === updatedBlock.id ? updatedBlock : b));
  };

  const handleSplitBlock = (blockId: string) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;
    const blockEndTime = block.startTime + block.duration;
    const splitPoint = (lunchRule.enabled && block.startTime < lunchRule.endTime && blockEndTime > lunchRule.startTime)
      ? lunchRule.startTime : block.startTime + Math.floor(block.duration / 2);
    const firstDuration = splitPoint - block.startTime;
    const secondDuration = blockEndTime - splitPoint;
    if (firstDuration < 15 || secondDuration < 15) {
      alert("Cannot split block: remaining segments would be too short.");
      return;
    }
    const originalTitle = block.originalTitle || block.title;
    const part1: TimeBlock = { ...block, id: Math.random().toString(36).substr(2, 9), title: `${originalTitle} (Part A)`, originalTitle, duration: firstDuration };
    const part2: TimeBlock = { ...block, id: Math.random().toString(36).substr(2, 9), title: `${originalTitle} (Part B)`, originalTitle, startTime: lunchRule.enabled && splitPoint === lunchRule.startTime ? lunchRule.endTime : splitPoint, duration: secondDuration, dependencies: [...block.dependencies, part1.id] };
    setBlocks(prev => [...prev.filter(b => b.id !== blockId), part1, part2]);
    setSelectedBlockId(part2.id);
  };

  const handleMergeBlocks = (blockId: string) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block || !block.originalTitle) return;
    const partner = blocks.find(b => b.id !== block.id && b.originalTitle === block.originalTitle);
    if (!partner) return;
    const first = block.startTime < partner.startTime ? block : partner;
    const second = block.startTime < partner.startTime ? partner : block;
    const mergedBlock: TimeBlock = { ...first, id: Math.random().toString(36).substr(2, 9), title: first.originalTitle || first.title, duration: (second.startTime + second.duration) - first.startTime, dependencies: first.dependencies.filter(d => d !== second.id) };
    setBlocks(prev => [...prev.filter(b => b.id !== block.id && b.id !== partner.id), mergedBlock]);
    setSelectedBlockId(mergedBlock.id);
  };

  // Add handleImportCFP to handle file imports and fix the compilation error
  const handleImportCFP = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        if (data.blocks) setBlocks(data.blocks);
        if (data.profiles) setProfiles(data.profiles);
        if (data.categories) setCategories(data.categories);
        if (data.resources) setResources(data.resources);
        if (data.lunchRule) setLunchRule(data.lunchRule);
      } catch (err) {
        console.error("Import failed:", err);
        alert("Failed to import file. Please check if the file format is valid.");
      }
    };
    reader.readAsText(file);
  };

  const isMobile = window.innerWidth < 1024;
  const selectedBlock = blocks.find(b => b.id === selectedBlockId) || null;

  return (
    <div className="h-screen bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-slate-100 flex flex-col overflow-hidden select-none transition-colors duration-300">
      {!isCenterFullScreen && (
        <nav className="h-14 lg:h-16 bg-white dark:bg-dark-surface border-b dark:border-dark-border px-4 lg:px-6 flex items-center justify-between z-50 shrink-0 shadow-sm no-print">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20"><Layers size={18} /></div>
            <h1 className="hidden sm:block text-sm lg:text-lg font-bold tracking-tight">Chronos Flow Pro</h1>
          </div>
          <div className="flex items-center gap-2 lg:gap-4">
             <div className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl border dark:border-slate-700/50">
                <button onClick={() => setZoom(Math.max(0.4, zoom - 0.1))} className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-500 transition-all"><ZoomOut size={14} /></button>
                <span className="text-[10px] font-bold text-slate-400 min-w-[36px] text-center">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(Math.min(3, zoom + 0.1))} className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-500 transition-all"><ZoomIn size={14} /></button>
             </div>
             <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl border dark:border-slate-700/50">
                <button onClick={() => setOrientation('portrait')} className={`p-1.5 rounded-lg transition-all ${orientation === 'portrait' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}><Smartphone size={14} /></button>
                <button onClick={() => setOrientation('landscape')} className={`p-1.5 rounded-lg transition-all ${orientation === 'landscape' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}><Monitor size={14} /></button>
             </div>
             <div className="flex items-center gap-2 border-l dark:border-slate-800 pl-4">
                <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 transition-colors">
                  {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <button onClick={() => { if(confirm('Clear all workspace data?')) { localStorage.clear(); window.location.reload(); } }} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors rounded-xl"><RotateCcw size={18} /></button>
             </div>
          </div>
        </nav>
      )}

      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar Panel */}
        <aside 
          className={`
            ${!isMobile ? 'lg:flex lg:relative' : (mobileTab === 'sidebar' ? 'flex flex-1' : 'hidden')}
            ${isCenterFullScreen ? 'hidden' : ''}
            h-full bg-white dark:bg-dark-surface border-r dark:border-dark-border transition-all shrink-0 overflow-hidden relative
          `}
          style={!isMobile ? { width: isLeftPanelOpen ? leftWidth : 56 } : {}}
        >
          <Sidebar 
            profiles={profiles} categories={categories} resources={resources}
            onUpdateProfiles={setProfiles} onUpdateCategories={setCategories} onUpdateResources={setResources}
            onAddBlockFromProfile={handleAddBlockFromProfile} lunchRule={lunchRule} onUpdateLunchRule={setLunchRule}
            isOpen={isLeftPanelOpen || mobileTab === 'sidebar'}
            onToggle={() => { if (isMobile) setMobileTab('timeline'); else setIsLeftPanelOpen(!isLeftPanelOpen); }}
            onExportCFP={() => downloadFile(JSON.stringify({blocks, profiles, categories, resources, lunchRule}), 'chronos_export.cfp', 'application/json')}
            onImportCFP={handleImportCFP}
            onExportCSV={() => downloadFile(generateCSV(blocks, categories, resources), 'schedule_summary.csv', 'text/csv')}
            onExportPDF={() => { setIsCenterFullScreen(true); setTimeout(() => { window.print(); setIsCenterFullScreen(false); }, 800); }}
          />
          {!isMobile && isLeftPanelOpen && !isCenterFullScreen && (
            <div onMouseDown={() => handleResizerStart('left')} className="absolute right-0 top-0 bottom-0 w-1.5 resizer-h z-[60]" />
          )}
        </aside>

        {/* Timeline Panel */}
        <div className={`flex-1 flex flex-col min-w-0 h-full transition-all duration-300 ${mobileTab === 'timeline' ? 'flex' : 'hidden lg:flex'}`}>
           <div className="flex-1 overflow-hidden relative">
              {blocks.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center m-4 bg-white/40 dark:bg-dark-surface/30 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                  <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-full flex items-center justify-center mb-6"><Plus size={32} /></div>
                  <h3 className="text-xl font-bold mb-2">Workspace Empty</h3>
                  <p className="text-slate-500 text-sm max-w-xs mb-8">Deploy units from your library or import a config file.</p>
                  <button onClick={() => handleAddBlockFromProfile(profiles[0])} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20">Add First Unit</button>
                </div>
              ) : (
                <Timeline 
                  blocks={blocks} categories={categories}
                  onUpdateBlock={handleUpdateBlock} onDeleteBlock={(id) => setBlocks(prev => prev.filter(b => b.id !== id))} 
                  onSelectBlock={(id) => { setSelectedBlockId(id); if (isMobile && id) setMobileTab('detail'); }} 
                  selectedBlockId={selectedBlockId} lunchRule={lunchRule} onSplitBlock={handleSplitBlock} onMergeBlocks={handleMergeBlocks}
                  orientation={orientation} fontSize={12} zoom={zoom} isFullScreen={isCenterFullScreen} onToggleFullScreen={() => setIsCenterFullScreen(!isCenterFullScreen)}
                />
              )}
           </div>
        </div>

        {/* Detail Panel */}
        <aside 
          className={`
            ${!isMobile ? 'lg:flex lg:relative' : (mobileTab === 'detail' ? 'flex flex-1' : 'hidden')}
            ${isCenterFullScreen ? 'hidden' : ''}
            h-full bg-white dark:bg-dark-surface border-l dark:border-dark-border transition-all shrink-0 overflow-hidden relative
          `}
          style={!isMobile ? { width: isRightPanelOpen ? rightWidth : 56 } : {}}
        >
          {!isMobile && isRightPanelOpen && !isCenterFullScreen && (
            <div onMouseDown={() => handleResizerStart('right')} className="absolute left-0 top-0 bottom-0 w-1.5 resizer-h z-[60]" />
          )}
          <DetailPanel 
            block={selectedBlock} allBlocks={blocks} categories={categories} resources={resources}
            onUpdate={handleUpdateBlock} onClose={() => { setSelectedBlockId(null); if (isMobile) setMobileTab('timeline'); }}
            isOpen={isRightPanelOpen || mobileTab === 'detail'}
            onToggle={() => { if (isMobile) setMobileTab('timeline'); else setIsRightPanelOpen(!isRightPanelOpen); }}
          />
        </aside>
      </main>

      {!isCenterFullScreen && (
        <div className="lg:hidden h-16 bg-white dark:bg-dark-surface border-t dark:border-dark-border flex items-center justify-around px-2 z-[70] no-print shrink-0">
           <button onClick={() => setMobileTab('sidebar')} className={`flex flex-col items-center gap-1 flex-1 transition-all ${mobileTab === 'sidebar' ? 'text-indigo-600' : 'text-slate-400'}`}>
             <Library size={20} /><span className="text-[10px] font-bold uppercase tracking-tighter">Library</span>
           </button>
           <button onClick={() => setMobileTab('timeline')} className={`flex flex-col items-center gap-1 flex-1 transition-all ${mobileTab === 'timeline' ? 'text-indigo-600' : 'text-slate-400'}`}>
             <LayoutGrid size={20} /><span className="text-[10px] font-bold uppercase tracking-tighter">Timeline</span>
           </button>
           <button onClick={() => setMobileTab('detail')} className={`flex flex-col items-center gap-1 flex-1 transition-all ${mobileTab === 'detail' ? 'text-indigo-600' : 'text-slate-400'}`}>
             <Settings2 size={20} /><span className="text-[10px] font-bold uppercase tracking-tighter">Unit Config</span>
           </button>
        </div>
      )}
    </div>
  );
};

export default App;

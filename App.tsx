
import React, { useState, useEffect } from 'react';
import { TimeBlock, ProfileBlock, Category, Resource, LunchBreakRule, Orientation } from './types';
import Sidebar from './components/Sidebar';
import Timeline from './components/Timeline';
import DetailPanel from './components/DetailPanel';
import { START_HOUR, INITIAL_PROFILES, INITIAL_CATEGORIES, INITIAL_RESOURCES } from './constants';
import { Clock, Wand2, RefreshCw, Layers, Moon, Sun, Monitor, Smartphone, Type, ZoomIn, ZoomOut, Library, LayoutGrid, Settings2, RotateCcw } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { downloadFile, generateCSV } from './utils';

type MobileTab = 'sidebar' | 'timeline' | 'detail';

const App: React.FC = () => {
  // Persistence Loading
  const loadState = <T,>(key: string, defaultValue: T): T => {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultValue;
  };

  const [blocks, setBlocks] = useState<TimeBlock[]>(() => loadState('cfp_blocks', []));
  const [profiles, setProfiles] = useState<ProfileBlock[]>(() => loadState('cfp_profiles', INITIAL_PROFILES));
  const [categories, setCategories] = useState<Category[]>(() => loadState('cfp_categories', INITIAL_CATEGORIES));
  const [resources, setResources] = useState<Resource[]>(() => loadState('cfp_resources', INITIAL_RESOURCES));
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [lunchRule, setLunchRule] = useState<LunchBreakRule>(() => loadState('cfp_lunchRule', { enabled: true, startTime: 720, endTime: 780 }));
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => loadState('cfp_darkMode', true));
  const [orientation, setOrientation] = useState<Orientation>(() => loadState('cfp_orientation', 'landscape'));
  const [fontSize, setFontSize] = useState(() => loadState('cfp_fontSize', 12));
  const [zoom, setZoom] = useState(() => loadState('cfp_zoom', 1.0));
  const [mobileTab, setMobileTab] = useState<MobileTab>('timeline');

  // Persistence Saving
  useEffect(() => localStorage.setItem('cfp_blocks', JSON.stringify(blocks)), [blocks]);
  useEffect(() => localStorage.setItem('cfp_profiles', JSON.stringify(profiles)), [profiles]);
  useEffect(() => localStorage.setItem('cfp_categories', JSON.stringify(categories)), [categories]);
  useEffect(() => localStorage.setItem('cfp_resources', JSON.stringify(resources)), [resources]);
  useEffect(() => localStorage.setItem('cfp_lunchRule', JSON.stringify(lunchRule)), [lunchRule]);
  useEffect(() => localStorage.setItem('cfp_darkMode', JSON.stringify(isDarkMode)), [isDarkMode]);
  useEffect(() => localStorage.setItem('cfp_orientation', JSON.stringify(orientation)), [orientation]);
  useEffect(() => localStorage.setItem('cfp_fontSize', JSON.stringify(fontSize)), [fontSize]);
  useEffect(() => localStorage.setItem('cfp_zoom', JSON.stringify(zoom)), [zoom]);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  const selectedBlock = blocks.find(b => b.id === selectedBlockId) || null;

  const handleReset = () => {
    if (confirm("Clear all timeline data? This cannot be undone.")) {
      setBlocks([]);
      setSelectedBlockId(null);
    }
  };

  const handleAddBlockFromProfile = (profile: ProfileBlock) => {
    const newBlock: TimeBlock = {
      id: Math.random().toString(36).substr(2, 9),
      title: profile.name,
      originalTitle: profile.name,
      description: '',
      startTime: (START_HOUR + 2) * 60,
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
    if (window.innerWidth < 1024) setMobileTab('timeline');
  };

  const handleUpdateBlock = (updatedBlock: TimeBlock) => {
    setBlocks(prev => prev.map(b => b.id === updatedBlock.id ? updatedBlock : b));
  };

  const handleDeleteBlock = (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id).map(b => ({
      ...b,
      dependencies: b.dependencies.filter(d => d !== id)
    })));
    if (selectedBlockId === id) setSelectedBlockId(null);
  };

  const handleSplitBlock = (blockId: string) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;
    const originalEndTime = block.startTime + block.duration;
    const duration1 = Math.max(15, lunchRule.startTime - block.startTime);
    const duration2 = Math.max(15, originalEndTime - lunchRule.endTime);
    const part1: TimeBlock = { 
      ...block, 
      id: Math.random().toString(36).substr(2, 9), 
      title: `${block.title} (A)`, 
      originalTitle: block.originalTitle || block.title,
      duration: duration1 
    };
    const part2: TimeBlock = { 
      ...block, 
      id: Math.random().toString(36).substr(2, 9), 
      title: `${block.title} (B)`, 
      originalTitle: block.originalTitle || block.title,
      startTime: lunchRule.endTime, 
      duration: duration2, 
      dependencies: [...block.dependencies, part1.id], 
      lane: block.lane 
    };
    setBlocks(prev => [...prev.filter(b => b.id !== blockId), part1, part2]);
    setSelectedBlockId(part2.id);
  };

  const handleExportCFP = () => {
    const data = { blocks, profiles, categories, resources, lunchRule, orientation, fontSize, zoom };
    downloadFile(JSON.stringify(data, null, 2), 'project.cfp', 'application/json');
  };

  const handleImportCFP = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.blocks) setBlocks(data.blocks);
        if (data.profiles) setProfiles(data.profiles);
        if (data.categories) setCategories(data.categories);
        if (data.resources) setResources(data.resources);
        if (data.lunchRule) setLunchRule(data.lunchRule);
        if (data.orientation) setOrientation(data.orientation);
        if (data.fontSize) setFontSize(data.fontSize);
        if (data.zoom) setZoom(data.zoom);
      } catch (err) { alert("Failed to load .CFP file."); }
    };
    reader.readAsText(file);
  };

  const handleExportCSV = () => {
    downloadFile(generateCSV(blocks, categories, resources), 'schedule.csv', 'text/csv');
  };

  const handleExportPDF = () => {
    const wasLeftOpen = isLeftPanelOpen;
    const wasRightOpen = isRightPanelOpen;
    setIsLeftPanelOpen(false);
    setIsRightPanelOpen(false);
    setTimeout(() => {
      window.print();
      setIsLeftPanelOpen(wasLeftOpen);
      setIsRightPanelOpen(wasRightOpen);
    }, 150);
  };

  const optimizeWithAI = async () => {
    if (!process.env.API_KEY) return;
    setIsAiProcessing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Analyze this industrial schedule for equipment bottlenecks. Equipment: ${resources.map(r => r.name).join(', ')}. Blocks: ${blocks.map(b => `${b.title} starts ${b.startTime} duration ${b.duration}`).join('\n')}`;
      const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
      alert(`AI Scheduling Insights:\n\n${response.text}`);
    } catch (err) { console.error(err); } finally { setIsAiProcessing(false); }
  };

  return (
    <div className="h-screen bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-slate-100 flex flex-col overflow-hidden transition-colors duration-300 select-none">
      <nav className="h-14 lg:h-16 bg-white dark:bg-dark-surface border-b dark:border-dark-border px-4 lg:px-6 flex items-center justify-between sticky top-0 z-50 shrink-0 no-print shadow-sm">
        <div className="flex items-center gap-2 lg:gap-3">
          <div className="w-8 h-8 lg:w-10 lg:h-10 bg-indigo-600 rounded-lg lg:rounded-xl flex items-center justify-center text-white shadow-lg"><Layers size={18} /></div>
          <div className="hidden sm:block">
            <h1 className="text-sm lg:text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Chronos Flow Pro</h1>
            <p className="text-[8px] lg:text-[10px] text-indigo-500 dark:text-indigo-400 font-bold uppercase tracking-widest leading-none mt-0.5">Industrial Resource Planner</p>
          </div>
        </div>

        <div className="flex items-center gap-2 lg:gap-6">
           <div className="flex items-center gap-1 lg:gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              <button onClick={() => setZoom(Math.max(0.2, zoom - 0.2))} className="p-1 lg:p-1.5 rounded-md hover:bg-white dark:hover:bg-slate-700 text-slate-500 transition-all"><ZoomOut size={14} /></button>
              <span className="text-[9px] lg:text-[10px] font-bold text-slate-400 min-w-[30px] lg:min-w-[35px] text-center">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(Math.min(4, zoom + 0.2))} className="p-1 lg:p-1.5 rounded-md hover:bg-white dark:hover:bg-slate-700 text-slate-500 transition-all"><ZoomIn size={14} /></button>
           </div>

           <div className="flex items-center gap-1 lg:gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              <button onClick={() => setOrientation('portrait')} className={`p-1 lg:p-1.5 rounded-md transition-all ${orientation === 'portrait' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500'}`}><Smartphone size={14} /></button>
              <button onClick={() => setOrientation('landscape')} className={`p-1 lg:p-1.5 rounded-md transition-all ${orientation === 'landscape' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500'}`}><Monitor size={14} /></button>
           </div>

           <div className="flex items-center gap-2 border-l dark:border-slate-800 pl-3 lg:pl-6">
              <button onClick={handleReset} className="p-1.5 lg:p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-slate-400 hover:text-red-500 transition-colors" title="Reset Timeline"><RotateCcw size={18} /></button>
              <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-1.5 lg:p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 transition-colors">
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button onClick={optimizeWithAI} disabled={isAiProcessing} className="hidden sm:flex px-3 lg:px-4 py-1.5 lg:py-2 bg-indigo-600 text-white rounded-lg text-[10px] lg:text-xs font-bold shadow-md hover:bg-indigo-700 transition-all items-center gap-2 disabled:opacity-50">
                {isAiProcessing ? <RefreshCw className="animate-spin" size={12} /> : <Wand2 size={12} />} <span className="hidden lg:inline">AI Optimization</span>
              </button>
        </div>
      </nav>

      <main className="flex-1 p-2 lg:p-6 flex gap-4 lg:gap-6 overflow-hidden relative">
        <div className={`
          ${mobileTab === 'sidebar' ? 'fixed inset-0 z-[60] flex p-4 bg-slate-50/90 dark:bg-dark-bg/90 backdrop-blur-sm' : 'hidden'}
          lg:relative lg:flex lg:inset-auto lg:p-0 lg:z-0 lg:bg-transparent lg:backdrop-none
        `}>
          <Sidebar 
            profiles={profiles} categories={categories} resources={resources}
            onUpdateProfiles={setProfiles} onUpdateCategories={setCategories} onUpdateResources={setResources}
            onAddBlockFromProfile={handleAddBlockFromProfile} lunchRule={lunchRule} onUpdateLunchRule={setLunchRule}
            isOpen={isLeftPanelOpen || mobileTab === 'sidebar'}
            onToggle={() => { if (window.innerWidth < 1024) setMobileTab('timeline'); else setIsLeftPanelOpen(!isLeftPanelOpen); }}
            onExportCFP={handleExportCFP} onImportCFP={handleImportCFP} onExportCSV={handleExportCSV} onExportPDF={handleExportPDF}
          />
        </div>
        
        <div className={`flex-1 h-full ${mobileTab === 'timeline' ? 'block' : 'hidden lg:block'}`}>
          <Timeline 
            blocks={blocks} categories={categories}
            onUpdateBlock={handleUpdateBlock} onDeleteBlock={handleDeleteBlock} 
            onSelectBlock={(id) => { setSelectedBlockId(id); if (window.innerWidth < 1024 && id) setMobileTab('detail'); }} 
            selectedBlockId={selectedBlockId} lunchRule={lunchRule} onSplitBlock={handleSplitBlock} 
            orientation={orientation} fontSize={fontSize} zoom={zoom}
          />
        </div>
        
        <div className={`
          ${mobileTab === 'detail' ? 'fixed inset-0 z-[60] flex p-4 bg-slate-50/90 dark:bg-dark-bg/90 backdrop-blur-sm' : 'hidden'}
          lg:relative lg:flex lg:inset-auto lg:p-0 lg:z-0 lg:bg-transparent lg:backdrop-none
        `}>
          <DetailPanel 
            block={selectedBlock} allBlocks={blocks} categories={categories} resources={resources}
            onUpdate={handleUpdateBlock} 
            onClose={() => { setSelectedBlockId(null); if (window.innerWidth < 1024) setMobileTab('timeline'); }}
            isOpen={isRightPanelOpen || mobileTab === 'detail'}
            onToggle={() => { if (window.innerWidth < 1024) setMobileTab('timeline'); else setIsRightPanelOpen(!isRightPanelOpen); }}
          />
        </div>
      </main>

      <div className="lg:hidden h-16 bg-white dark:bg-dark-surface border-t dark:border-dark-border flex items-center justify-around px-2 z-[70] no-print">
         <button onClick={() => setMobileTab('sidebar')} className={`flex flex-col items-center gap-1 flex-1 transition-colors ${mobileTab === 'sidebar' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
           <Library size={20} /><span className="text-[10px] font-bold uppercase">Library</span>
         </button>
         <button onClick={() => setMobileTab('timeline')} className={`flex flex-col items-center gap-1 flex-1 transition-colors ${mobileTab === 'timeline' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
           <LayoutGrid size={20} /><span className="text-[10px] font-bold uppercase">Timeline</span>
         </button>
         <button onClick={() => setMobileTab('detail')} className={`flex flex-col items-center gap-1 flex-1 transition-colors ${mobileTab === 'detail' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
           <Settings2 size={20} /><span className="text-[10px] font-bold uppercase">Config</span>
         </button>
      </div>

      <footer className="hidden lg:flex h-10 bg-white dark:bg-dark-surface border-t dark:border-dark-border px-6 items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-medium shrink-0 no-print">
        <div className="flex gap-4 uppercase tracking-tighter">
          <span>{blocks.length} Units Active</span>
          <span>{resources.length} System Resources</span>
        </div>
        <div className="flex gap-4 items-center">
          <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div> PRO ENGINE ACTIVE</span>
        </div>
      </footer>
    </div>
  );
};

export default App;

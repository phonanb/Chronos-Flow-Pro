
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TimeBlock, ProfileBlock, Category, Resource, LunchBreakRule, EveningBreakRule } from './types';
import Sidebar from './components/Sidebar';
import Timeline, { TimelineRef } from './components/Timeline';
import DetailPanel from './components/DetailPanel';
import { START_HOUR, END_HOUR, INITIAL_PROFILES, INITIAL_CATEGORIES, INITIAL_RESOURCES, DAYS_IN_WEEK } from './constants';
import { Layers, Moon, Sun, ZoomIn, ZoomOut, Library, LayoutGrid, Settings2, RotateCcw, Plus, Share2, Check, Heart, X, Sparkles, Copy, Trash2 } from 'lucide-react';
import { downloadFile, generateCSV } from './utils';

type MobileTab = 'sidebar' | 'timeline' | 'detail';

const App: React.FC = () => {
  const loadState = <T,>(key: string, defaultValue: T): T => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  };

  const [blocks, setBlocks] = useState<TimeBlock[]>(() => loadState('cfp_blocks', []));
  const [profiles, setProfiles] = useState<ProfileBlock[]>(() => loadState('cfp_profiles', INITIAL_PROFILES));
  const [categories, setCategories] = useState<Category[]>(() => loadState('cfp_categories', INITIAL_CATEGORIES));
  const [resources, setResources] = useState<Resource[]>(() => loadState('cfp_resources', INITIAL_RESOURCES));
  const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>([]);
  const [lunchRule, setLunchRule] = useState<LunchBreakRule>(() => loadState('cfp_lunchRule', { enabled: true, startTime: 720, endTime: 780 }));
  const [eveningRule, setEveningRule] = useState<EveningBreakRule>(() => loadState('cfp_eveningRule', { enabled: true, startTime: 1020, endTime: 1050 }));
  const [isDarkMode, setIsDarkMode] = useState(() => loadState('cfp_darkMode', true));
  const [zoom, setZoom] = useState(() => loadState('cfp_zoom', 1.0));
  const [mobileTab, setMobileTab] = useState<MobileTab>('timeline');
  const [isCenterFullScreen, setIsCenterFullScreen] = useState(false);
  const [shareFeedback, setShareFeedback] = useState(false);
  const [isDonateOpen, setIsDonateOpen] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [isShortening, setIsShortening] = useState(false);
  
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(window.innerWidth > 1024);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(window.innerWidth > 1280);

  const [leftWidth, setLeftWidth] = useState(() => loadState('cfp_leftWidth', 260));
  const [rightWidth, setRightWidth] = useState(() => loadState('cfp_rightWidth', 320));

  const timelineRef = useRef<TimelineRef>(null);
  const resizingRef = useRef<'left' | 'right' | null>(null);

  // Keyboard listeners for Delete key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Prevent deleting if user is typing in an input/textarea
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
        
        if (selectedBlockIds.length > 0) {
          handleDeleteBlocks(selectedBlockIds);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedBlockIds, blocks]);

  // Handle Shared URL Data
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#share=')) {
      try {
        const encodedData = hash.replace('#share=', '');
        const decodedData = JSON.parse(decodeURIComponent(escape(atob(encodedData))));
        
        if (decodedData.blocks) setBlocks(decodedData.blocks);
        if (decodedData.profiles) setProfiles(decodedData.profiles);
        if (decodedData.categories) setCategories(decodedData.categories);
        if (decodedData.resources) setResources(decodedData.resources);
        if (decodedData.lunchRule) setLunchRule(decodedData.lunchRule);
        if (decodedData.eveningRule) setEveningRule(decodedData.eveningRule);
        
        window.history.replaceState(null, '', window.location.pathname);
        alert("Configuration loaded from shared link!");
      } catch (e) {
        console.error("Failed to parse shared data", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('cfp_blocks', JSON.stringify(blocks));
    localStorage.setItem('cfp_profiles', JSON.stringify(profiles));
    localStorage.setItem('cfp_categories', JSON.stringify(categories));
    localStorage.setItem('cfp_resources', JSON.stringify(resources));
    localStorage.setItem('cfp_lunchRule', JSON.stringify(lunchRule));
    localStorage.setItem('cfp_eveningRule', JSON.stringify(eveningRule));
    localStorage.setItem('cfp_darkMode', JSON.stringify(isDarkMode));
    localStorage.setItem('cfp_zoom', JSON.stringify(zoom));
    localStorage.setItem('cfp_leftWidth', JSON.stringify(leftWidth));
    localStorage.setItem('cfp_rightWidth', JSON.stringify(rightWidth));
  }, [blocks, profiles, categories, resources, lunchRule, eveningRule, isDarkMode, zoom, leftWidth, rightWidth]);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  const handleResizerStart = useCallback((side: 'left' | 'right') => {
    if (window.innerWidth < 1024) return;
    resizingRef.current = side;
    document.body.style.cursor = 'col-resize';
  }, []);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;
      if (resizingRef.current === 'left') {
        setLeftWidth(Math.max(180, Math.min(e.clientX, 400)));
      } else {
        setRightWidth(Math.max(240, Math.min(window.innerWidth - e.clientX, 480)));
      }
    };
    const handleUp = () => {
      resizingRef.current = null;
      document.body.style.cursor = '';
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, []);

  const handleAiGenerate = async () => {
    if (isAiGenerating) return;
    setIsAiGenerating(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    try {
      let referenceBlocks = blocks.length > 0 ? [...blocks] : [];
      if (referenceBlocks.length === 0) {
        let currentTime = 480;
        profiles.forEach((p, i) => {
          referenceBlocks.push({
            id: `seed-${i}`,
            title: p.name,
            description: '',
            startTime: currentTime,
            duration: p.defaultDuration,
            categoryId: p.categoryId,
            dependencies: i > 0 ? [`seed-${i-1}`] : [],
            resourceIds: [...p.resourceIds],
            prerequisites: [],
            color: p.color,
            isLocked: false,
            lane: 0
          });
          currentTime += p.defaultDuration + 30;
        });
      }
      const newPlan: TimeBlock[] = [];
      const blocksByDay = referenceBlocks.reduce((acc, b) => {
        const day = Math.floor(b.startTime / 1440);
        if (!acc[day]) acc[day] = [];
        acc[day].push(b);
        return acc;
      }, {} as Record<number, TimeBlock[]>);
      const dayPattern = Object.values(blocksByDay).sort((a, b) => b.length - a.length)[0] || referenceBlocks;
      for (let day = 0; day < DAYS_IN_WEEK; day++) {
        const dayOffset = day * 1440;
        const idMap: Record<string, string> = {};
        dayPattern.forEach(b => {
          idMap[b.id] = `gen-${day}-${Math.random().toString(36).substr(2, 5)}`;
        });
        dayPattern.forEach(b => {
          const startTimeInDay = b.startTime % 1440;
          newPlan.push({
            ...b,
            id: idMap[b.id],
            startTime: dayOffset + startTimeInDay,
            dependencies: b.dependencies.map(d => idMap[d]).filter(d => !!d),
            lane: (b.lane + (day % 3))
          });
        });
      }
      setBlocks(newPlan);
      setTimeout(() => timelineRef.current?.scrollToFirstBlock(), 300);
    } catch (error) {
      console.error("Local Generation Error:", error);
      alert("Smart generation encountered an error.");
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleShare = async () => {
    setIsShortening(true);
    const stateToShare = { blocks, profiles, categories, resources, lunchRule, eveningRule };
    const jsonStr = JSON.stringify(stateToShare);
    const encoded = btoa(unescape(encodeURIComponent(jsonStr)));
    const longUrl = `${window.location.origin}${window.location.pathname}#share=${encoded}`;
    
    let finalUrl = longUrl;

    try {
      // is.gd is a free shortening service that is relatively CORS-friendly for simple requests
      // However, if it fails, we fallback to the long URL.
      const response = await fetch(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(longUrl)}`);
      if (response.ok) {
        finalUrl = await response.text();
      }
    } catch (e) {
      console.warn("URL shortening failed, using long URL instead.", e);
    }

    navigator.clipboard.writeText(finalUrl).then(() => {
      setShareFeedback(true);
      setTimeout(() => setShareFeedback(false), 2000);
    }).catch(err => {
      alert("Failed to copy link.");
      console.error(err);
    }).finally(() => {
      setIsShortening(false);
    });
  };

  const handleExportPDF = () => {
    timelineRef.current?.scrollToFirstBlock();
    setIsCenterFullScreen(true);
    setTimeout(() => {
      window.print();
      setIsCenterFullScreen(false);
    }, 800);
  };

  const handleAddBlockAtPosition = (profile: ProfileBlock, startTime: number, lane: number) => {
    const newBlock: TimeBlock = {
      id: Math.random().toString(36).substr(2, 9),
      title: profile.name,
      originalTitle: profile.name,
      description: '',
      startTime: startTime,
      duration: profile.defaultDuration,
      categoryId: profile.categoryId,
      dependencies: [],
      resourceIds: [...profile.resourceIds],
      prerequisites: [],
      color: profile.color,
      isLocked: false,
      lane: lane
    };
    setBlocks(prev => [...prev, newBlock]);
    setSelectedBlockIds([newBlock.id]);
    if (!isRightPanelOpen) setIsRightPanelOpen(true);
    if (window.innerWidth < 1024) setMobileTab('detail');
  };

  const handleAddBlockFromProfile = (profile: ProfileBlock) => {
    handleAddBlockAtPosition(profile, 480, 0); 
  };

  const handleUpdateBlock = (updatedBlock: TimeBlock) => {
    setBlocks(prev => prev.map(b => b.id === updatedBlock.id ? updatedBlock : b));
  };

  const handleDeleteBlocks = (ids: string[]) => {
    setBlocks(prev => prev.filter(b => !ids.includes(b.id)));
    setSelectedBlockIds(prev => prev.filter(id => !ids.includes(id)));
  };

  const handleDuplicateBlocks = (ids: string[]) => {
    const blocksToCopy = blocks.filter(b => ids.includes(b.id));
    const newBlocks = blocksToCopy.map(b => ({
      ...b,
      id: Math.random().toString(36).substr(2, 9),
      startTime: b.startTime + 60, // Shift by 1 hour
      lane: b.lane + 1, // Shift lane
      dependencies: [] // Clear dependencies for copy to avoid circular refs
    }));
    setBlocks(prev => [...prev, ...newBlocks]);
    setSelectedBlockIds(newBlocks.map(nb => nb.id));
  };

  const handleSplitBlock = (blockId: string) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;
    const blockEndTime = block.startTime + block.duration;
    let splitPoint = block.startTime + Math.floor(block.duration / 2);
    if (lunchRule.enabled && block.startTime < lunchRule.endTime && blockEndTime > lunchRule.startTime) {
      splitPoint = lunchRule.startTime;
    } else if (eveningRule.enabled && block.startTime < eveningRule.endTime && blockEndTime > eveningRule.startTime) {
      splitPoint = eveningRule.startTime;
    }
    const firstDuration = splitPoint - block.startTime;
    const secondDuration = blockEndTime - splitPoint;
    if (firstDuration < 15 || secondDuration < 15) {
      alert("Cannot split block: segments too short.");
      return;
    }
    let resumeTime = splitPoint;
    if (lunchRule.enabled && splitPoint === lunchRule.startTime) resumeTime = lunchRule.endTime;
    else if (eveningRule.enabled && splitPoint === eveningRule.startTime) resumeTime = eveningRule.endTime;
    const part1: TimeBlock = { ...block, id: Math.random().toString(36).substr(2, 9), title: `${block.title} (Part A)`, duration: firstDuration };
    const part2: TimeBlock = { ...block, id: Math.random().toString(36).substr(2, 9), title: `${block.title} (Part B)`, startTime: resumeTime, duration: secondDuration, dependencies: [...block.dependencies, part1.id] };
    setBlocks(prev => [...prev.filter(b => b.id !== blockId), part1, part2]);
    setSelectedBlockIds([part2.id]);
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
    setSelectedBlockIds([mergedBlock.id]);
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
        if (data.eveningRule) setEveningRule(data.eveningRule);
      } catch (err) { alert("Invalid .CFP format."); }
    };
    reader.readAsText(file);
  };

  const isMobile = window.innerWidth < 1024;
  const selectedBlocks = blocks.filter(b => selectedBlockIds.includes(b.id));

  return (
    <div className="h-screen bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-slate-100 flex flex-col overflow-hidden select-none transition-colors duration-300">
      {!isCenterFullScreen && (
        <nav className="h-14 lg:h-16 bg-white dark:bg-dark-surface border-b dark:border-dark-border px-4 lg:px-6 flex items-center justify-between z-50 shrink-0 shadow-sm no-print">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20"><Layers size={18} /></div>
            <h1 className="hidden sm:block text-sm lg:text-lg font-bold tracking-tight">Chronos Flow Pro</h1>
          </div>
          <div className="flex items-center gap-2 lg:gap-4">
             {selectedBlockIds.length > 1 && (
               <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border dark:border-slate-700 animate-in slide-in-from-top-4 duration-300">
                  <button onClick={() => handleDuplicateBlocks(selectedBlockIds)} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-indigo-600 transition-all flex items-center gap-2" title="Copy Selected">
                    <Copy size={16} /><span className="text-[10px] font-bold uppercase">Copy ({selectedBlockIds.length})</span>
                  </button>
                  <button onClick={() => handleDeleteBlocks(selectedBlockIds)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/40 rounded-lg text-red-500 transition-all flex items-center gap-2" title="Delete Selected">
                    <Trash2 size={16} /><span className="text-[10px] font-bold uppercase">Delete</span>
                  </button>
               </div>
             )}
             <div className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl border dark:border-slate-700/50">
                <button onClick={() => setZoom(Math.max(0.4, zoom - 0.1))} className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-500 transition-all"><ZoomOut size={14} /></button>
                <span className="text-[10px] font-bold text-slate-400 min-w-[36px] text-center">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(Math.min(3, zoom + 0.1))} className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-500 transition-all"><ZoomIn size={14} /></button>
             </div>
             <div className="flex items-center gap-2 border-l dark:border-slate-800 pl-4">
                <button 
                  onClick={() => setIsDonateOpen(true)}
                  className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 hover:bg-pink-100 transition-all border border-pink-100 dark:border-pink-900/50 shadow-sm shadow-pink-500/10"
                >
                  <Heart size={16} fill="currentColor" />
                  Donate
                </button>
                <button 
                  onClick={handleShare} 
                  disabled={isShortening}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${shareFeedback ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-indigo-600 text-white shadow-indigo-500/20 hover:bg-indigo-700'} ${isShortening ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {shareFeedback ? <Check size={16} /> : <Share2 size={16} />}
                  <span className="hidden sm:inline">{shareFeedback ? 'Link Copied' : (isShortening ? 'Shortening...' : 'Share')}</span>
                </button>
                <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 transition-colors">
                  {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <button onClick={() => { if(confirm('Reset workspace?')) { localStorage.clear(); window.location.reload(); } }} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors rounded-xl" title="Reset Workspace"><RotateCcw size={18} /></button>
             </div>
          </div>
        </nav>
      )}

      <main className="flex-1 flex overflow-hidden">
        <aside 
          className={`${!isMobile ? 'lg:flex lg:relative' : (mobileTab === 'sidebar' ? 'flex flex-1' : 'hidden')} ${isCenterFullScreen ? 'hidden' : ''} h-full bg-white dark:bg-dark-surface border-r dark:border-dark-border shrink-0 overflow-hidden relative`}
          style={!isMobile ? { width: isLeftPanelOpen ? leftWidth : 56 } : {}}
        >
          <Sidebar 
            profiles={profiles} categories={categories} resources={resources}
            onUpdateProfiles={setProfiles} onUpdateCategories={setCategories} onUpdateResources={setResources}
            onAddBlockFromProfile={handleAddBlockFromProfile} 
            lunchRule={lunchRule} onUpdateLunchRule={setLunchRule}
            eveningRule={eveningRule} onUpdateEveningRule={setEveningRule}
            isOpen={isLeftPanelOpen || mobileTab === 'sidebar'}
            onToggle={() => { if (isMobile) setMobileTab('timeline'); else setIsLeftPanelOpen(!isLeftPanelOpen); }}
            onExportCFP={() => downloadFile(JSON.stringify({blocks, profiles, categories, resources, lunchRule, eveningRule}), 'chronos_export.cfp', 'application/json')}
            onImportCFP={handleImportCFP}
            onExportCSV={() => downloadFile(generateCSV(blocks, categories, resources), 'schedule.csv', 'text/csv')}
            onExportPDF={handleExportPDF}
            onAiGenerate={handleAiGenerate}
            isAiGenerating={isAiGenerating}
          />
          {!isMobile && isLeftPanelOpen && !isCenterFullScreen && (
            <div onMouseDown={() => handleResizerStart('left')} className="absolute right-0 top-0 bottom-0 w-1 px-1 cursor-col-resize z-[60] hover:bg-indigo-500/20" />
          )}
        </aside>

        <div className={`flex-1 flex flex-col min-w-0 h-full transition-all duration-300 ${mobileTab === 'timeline' ? 'flex' : 'hidden lg:flex'}`}>
           <div className="flex-1 overflow-hidden relative">
              {blocks.length === 0 && !isAiGenerating ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center m-4 bg-white/40 dark:bg-dark-surface/30 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                  <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-full flex items-center justify-center mb-6"><Plus size={32} /></div>
                  <h3 className="text-xl font-bold mb-2">No active units</h3>
                  <p className="text-slate-500 text-sm max-w-xs mb-8">Deploy components from the Quick Template library or use the Smart Generator.</p>
                  <button onClick={() => handleAddBlockFromProfile(profiles[0])} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20">Add First Unit</button>
                </div>
              ) : (
                <Timeline 
                  ref={timelineRef}
                  blocks={blocks} categories={categories} profiles={profiles}
                  onUpdateBlock={handleUpdateBlock} 
                  onDeleteBlock={(id) => handleDeleteBlocks([id])} 
                  onSelectBlock={(id, multi) => { 
                    if (multi) {
                      setSelectedBlockIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
                    } else {
                      setSelectedBlockIds([id]);
                    }
                    if (isMobile && id) setMobileTab('detail'); 
                  }} 
                  onSelectBlocks={(ids) => setSelectedBlockIds(ids)}
                  selectedBlockIds={selectedBlockIds} 
                  lunchRule={lunchRule} eveningRule={eveningRule}
                  onSplitBlock={handleSplitBlock} onMergeBlocks={handleMergeBlocks}
                  fontSize={12} zoom={zoom} isFullScreen={isCenterFullScreen} onToggleFullScreen={() => setIsCenterFullScreen(!isCenterFullScreen)}
                  onAddBlockAtPosition={handleAddBlockAtPosition}
                />
              )}
              {isAiGenerating && (
                <div className="absolute inset-0 bg-white/60 dark:bg-dark-bg/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-6 animate-in fade-in duration-300">
                   <div className="relative">
                      <div className="w-20 h-20 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin"></div>
                      <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600 animate-pulse" size={32} />
                   </div>
                   <div className="text-center">
                      <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest mb-2">Synthesizing 7-Day Plan</h2>
                      <p className="text-slate-500 dark:text-slate-400 text-sm font-medium animate-pulse">Analyzing reference patterns locally...</p>
                   </div>
                </div>
              )}
           </div>
        </div>

        <aside 
          className={`${!isMobile ? 'lg:flex lg:relative' : (mobileTab === 'detail' ? 'flex flex-1' : 'hidden')} ${isCenterFullScreen ? 'hidden' : ''} h-full bg-white dark:bg-dark-surface border-l dark:border-dark-border shrink-0 overflow-hidden relative`}
          style={!isMobile ? { width: isRightPanelOpen ? rightWidth : 56 } : {}}
        >
          {!isMobile && isRightPanelOpen && !isCenterFullScreen && (
            <div onMouseDown={() => handleResizerStart('right')} className="absolute left-0 top-0 bottom-0 w-1 px-1 cursor-col-resize z-[60] hover:bg-indigo-500/20" />
          )}
          <DetailPanel 
            blocks={selectedBlocks} allBlocks={blocks} categories={categories} resources={resources}
            onUpdate={handleUpdateBlock} onClose={() => { setSelectedBlockIds([]); if (isMobile) setMobileTab('timeline'); }}
            isOpen={isRightPanelOpen || mobileTab === 'detail'}
            onToggle={() => { if (isMobile) setMobileTab('timeline'); else setIsRightPanelOpen(!isRightPanelOpen); }}
            onDeleteSelected={() => handleDeleteBlocks(selectedBlockIds)}
            onDuplicateSelected={() => handleDuplicateBlocks(selectedBlockIds)}
          />
        </aside>
      </main>

      {isDonateOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200" onClick={() => setIsDonateOpen(false)}>
           <div className="bg-white dark:bg-dark-surface p-4 sm:p-8 rounded-3xl shadow-2xl max-w-sm w-full relative flex flex-col items-center border dark:border-dark-border" onClick={e => e.stopPropagation()}>
              <button onClick={() => setIsDonateOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"><X size={20} /></button>
              <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 text-pink-600 rounded-full flex items-center justify-center mb-4"><Heart size={24} fill="currentColor" /></div>
              <h3 className="text-xl font-bold text-center mb-1">Support Chronos Flow</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6">If you find this tool helpful, consider supporting its development!</p>
              
              <div className="bg-white p-4 rounded-2xl shadow-inner border dark:border-slate-800">
                 <img 
                    src="https://img2.pic.in.th/267263.jpg" 
                    alt="Thai QR Payment" 
                    className="w-64 h-auto rounded-lg mx-auto filter dark:invert-0"
                 />
                 <div className="mt-4 text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Thai QR Payment | PromptPay</p>
                 </div>
              </div>
              
              <p className="mt-6 text-[11px] text-slate-400 dark:text-slate-500 font-medium max-w-[240px] text-center">Scan with any Thai mobile banking app to donate. Thank you for your support!</p>
           </div>
        </div>
      )}

      {!isCenterFullScreen && (
        <div className="lg:hidden h-16 bg-white dark:bg-dark-surface border-t dark:border-dark-border flex items-center justify-around px-2 z-[70] no-print shrink-0">
           <button onClick={() => setMobileTab('sidebar')} className={`flex flex-col items-center gap-1 flex-1 ${mobileTab === 'sidebar' ? 'text-indigo-600' : 'text-slate-400'}`}>
             <Library size={20} /><span className="text-[10px] font-bold uppercase tracking-tighter">Library</span>
           </button>
           <button onClick={() => setMobileTab('timeline')} className={`flex flex-col items-center gap-1 flex-1 ${mobileTab === 'timeline' ? 'text-indigo-600' : 'text-slate-400'}`}>
             <LayoutGrid size={20} /><span className="text-[10px] font-bold uppercase tracking-tighter">Timeline</span>
           </button>
           <button onClick={() => setMobileTab('detail')} className={`flex flex-col items-center gap-1 flex-1 ${mobileTab === 'detail' ? 'text-indigo-600' : 'text-slate-400'}`}>
             <Settings2 size={20} /><span className="text-[10px] font-bold uppercase tracking-tighter">Unit Config</span>
           </button>
        </div>
      )}
    </div>
  );
};

export default App;

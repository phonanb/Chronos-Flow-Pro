
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TimeBlock, ProfileBlock, Category, Resource, LunchBreakRule, EveningBreakRule, Snapshot } from './types';
import Sidebar from './components/Sidebar';
import Timeline, { TimelineRef } from './components/Timeline';
import DetailPanel from './components/DetailPanel';
import { START_HOUR, END_HOUR, INITIAL_PROFILES, INITIAL_CATEGORIES, INITIAL_RESOURCES, DAYS_IN_WEEK } from './constants';
import { Layers, Moon, Sun, ZoomIn, ZoomOut, Library, LayoutGrid, Settings2, RotateCcw, Plus, Share2, Check, Heart, X, Sparkles, Copy, Trash2, Undo2, Redo2, History } from 'lucide-react';
import { downloadFile, generateCSV } from './utils';
import { GoogleGenAI, Type } from "@google/genai";

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
  const [history, setHistory] = useState<Snapshot[]>(() => loadState('cfp_history', []));
  
  const [isDarkMode, setIsDarkMode] = useState(() => loadState('cfp_darkMode', true));
  const [zoom, setZoom] = useState(() => loadState('cfp_zoom', 1.0));
  const [mobileTab, setMobileTab] = useState<MobileTab>('timeline');
  const [isCenterFullScreen, setIsCenterFullScreen] = useState(false);
  const [shareFeedback, setShareFeedback] = useState(false);
  const [isDonateOpen, setIsDonateOpen] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [isShortening, setIsShortening] = useState(false);
  
  // Undo/Redo Stacks
  const [undoStack, setUndoStack] = useState<TimeBlock[][]>([]);
  const [redoStack, setRedoStack] = useState<TimeBlock[][]>([]);

  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(window.innerWidth > 1024);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(window.innerWidth > 1280);
  const [leftWidth, setLeftWidth] = useState(() => loadState('cfp_leftWidth', 260));
  const [rightWidth, setRightWidth] = useState(() => loadState('cfp_rightWidth', 320));

  const timelineRef = useRef<TimelineRef>(null);
  const resizingRef = useRef<'left' | 'right' | null>(null);

  // Persistence
  useEffect(() => {
    localStorage.setItem('cfp_blocks', JSON.stringify(blocks));
    localStorage.setItem('cfp_profiles', JSON.stringify(profiles));
    localStorage.setItem('cfp_categories', JSON.stringify(categories));
    localStorage.setItem('cfp_resources', JSON.stringify(resources));
    localStorage.setItem('cfp_lunchRule', JSON.stringify(lunchRule));
    localStorage.setItem('cfp_eveningRule', JSON.stringify(eveningRule));
    localStorage.setItem('cfp_history', JSON.stringify(history));
    localStorage.setItem('cfp_darkMode', JSON.stringify(isDarkMode));
    localStorage.setItem('cfp_zoom', JSON.stringify(zoom));
    localStorage.setItem('cfp_leftWidth', JSON.stringify(leftWidth));
    localStorage.setItem('cfp_rightWidth', JSON.stringify(rightWidth));
  }, [blocks, profiles, categories, resources, lunchRule, eveningRule, history, isDarkMode, zoom, leftWidth, rightWidth]);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  // Keyboard Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedBlockIds.length > 0) handleDeleteBlocks(selectedBlockIds);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedBlockIds, blocks, undoStack, redoStack]);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setRedoStack(prev => [blocks, ...prev]);
    setUndoStack(prev => prev.slice(0, -1));
    setBlocks(previous);
  }, [blocks, undoStack]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[0];
    setUndoStack(prev => [...prev, blocks]);
    setRedoStack(prev => prev.slice(1));
    setBlocks(next);
  }, [blocks, redoStack]);

  const recordChange = useCallback((newBlocks: TimeBlock[]) => {
    setUndoStack(prev => [...prev, blocks].slice(-50)); // Keep last 50
    setRedoStack([]);
    setBlocks(newBlocks);
  }, [blocks]);

  // Snapshot Management
  const takeSnapshot = (name?: string) => {
    const newSnapshot: Snapshot = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      name: name || `Revision ${history.length + 1}`,
      blocks,
      profiles,
      categories,
      resources,
      lunchRule,
      eveningRule
    };
    setHistory(prev => [newSnapshot, ...prev].slice(0, 20)); // Keep 20 versions
  };

  const restoreSnapshot = (snapshot: Snapshot) => {
    if (!confirm(`Restore to "${snapshot.name}"? Current unsaved changes will be lost.`)) return;
    setBlocks(snapshot.blocks);
    setProfiles(snapshot.profiles);
    setCategories(snapshot.categories);
    setResources(snapshot.resources);
    setLunchRule(snapshot.lunchRule);
    setEveningRule(snapshot.eveningRule);
    setUndoStack([]);
    setRedoStack([]);
    alert(`Restored to ${snapshot.name}`);
  };

  const handleAiGenerate = async () => {
    if (isAiGenerating) return;
    takeSnapshot(`Auto-Save before AI Gen`);
    setIsAiGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Generate an optimal 7-day industrial schedule. 
      Categories: ${JSON.stringify(categories)}
      Resources: ${JSON.stringify(resources)}
      Templates: ${JSON.stringify(profiles)}
      Breaks: Lunch (${JSON.stringify(lunchRule)}), Evening (${JSON.stringify(eveningRule)})
      Constraints: No equipment conflicts, 30m stagger for Autoclaves, distribute across all 10080 mins.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          systemInstruction: "You are a Master Production Scheduler. Generate a valid array of TimeBlock JSON objects.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                startTime: { type: Type.INTEGER },
                duration: { type: Type.INTEGER },
                categoryId: { type: Type.STRING },
                dependencies: { type: Type.ARRAY, items: { type: Type.STRING } },
                resourceIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                lane: { type: Type.INTEGER }
              },
              required: ["id", "title", "startTime", "duration", "categoryId", "resourceIds", "lane"]
            }
          }
        }
      });

      const result = JSON.parse(response.text.trim() || '[]');
      if (result.length > 0) recordChange(result);
    } catch (error) {
      console.error(error);
      alert("AI Generation Error.");
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleShare = async () => {
    setIsShortening(true);
    const longUrl = `${window.location.origin}${window.location.pathname}#share=${btoa(unescape(encodeURIComponent(JSON.stringify({ blocks, profiles, categories, resources, lunchRule, eveningRule }))))}`;
    let finalUrl = longUrl;
    try {
      const res = await fetch(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(longUrl)}`);
      if (res.ok) finalUrl = await res.text();
    } catch (e) {}
    navigator.clipboard.writeText(finalUrl).then(() => {
      setShareFeedback(true);
      setTimeout(() => setShareFeedback(false), 2000);
    }).finally(() => setIsShortening(false));
  };

  const handleAddBlockAtPosition = (profile: ProfileBlock, startTime: number, lane: number) => {
    const newBlock: TimeBlock = {
      id: Math.random().toString(36).substr(2, 9),
      title: profile.name,
      originalTitle: profile.name,
      description: '',
      startTime,
      duration: profile.defaultDuration,
      categoryId: profile.categoryId,
      dependencies: [],
      resourceIds: [...profile.resourceIds],
      prerequisites: [],
      color: profile.color,
      isLocked: false,
      lane
    };
    recordChange([...blocks, newBlock]);
    setSelectedBlockIds([newBlock.id]);
  };

  const handleUpdateBlock = (updated: TimeBlock) => {
    recordChange(blocks.map(b => b.id === updated.id ? updated : b));
  };

  const handleDeleteBlocks = (ids: string[]) => {
    recordChange(blocks.filter(b => !ids.includes(b.id)));
    setSelectedBlockIds(prev => prev.filter(id => !ids.includes(id)));
  };

  const handleDuplicateBlocks = (ids: string[]) => {
    const newBlocks = blocks.filter(b => ids.includes(b.id)).map(b => ({
      ...b,
      id: Math.random().toString(36).substr(2, 9),
      startTime: b.startTime + 60,
      lane: b.lane + 1,
      dependencies: []
    }));
    recordChange([...blocks, ...newBlocks]);
    setSelectedBlockIds(newBlocks.map(nb => nb.id));
  };

  // Helper for adding from sidebar button
  const handleAddBlockFromProfile = (profile: ProfileBlock) => {
    handleAddBlockAtPosition(profile, 0, 0);
  };

  // Import CFP file handler
  const handleImportCFP = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = JSON.parse(e.target?.result as string);
        if (content.blocks) setBlocks(content.blocks);
        if (content.profiles) setProfiles(content.profiles);
        if (content.categories) setCategories(content.categories);
        if (content.resources) setResources(content.resources);
        if (content.lunchRule) setLunchRule(content.lunchRule);
        if (content.eveningRule) setEveningRule(content.eveningRule);
        alert('Import successful');
      } catch (err) {
        alert('Failed to parse CFP file');
      }
    };
    reader.readAsText(file);
  };

  // PDF Export using browser print
  const handleExportPDF = () => {
    window.print();
  };

  // Split logic for units
  const handleSplitBlock = (id: string) => {
    const block = blocks.find(b => b.id === id);
    if (!block || block.duration <= 30) return;
    const half = Math.floor(block.duration / 2 / 15) * 15;
    const b1: TimeBlock = { ...block, duration: half, title: `${block.title} (Part 1)` };
    const b2: TimeBlock = { 
      ...block, 
      id: Math.random().toString(36).substr(2, 9), 
      startTime: block.startTime + half, 
      duration: block.duration - half, 
      title: `${block.title} (Part 2)` 
    };
    recordChange(blocks.map(b => b.id === id ? b1 : b).concat(b2));
  };

  // Merge logic for split units
  const handleMergeBlocks = (id: string) => {
    const block = blocks.find(b => b.id === id);
    if (!block || !block.title.includes(' (Part ')) return;
    const baseTitle = block.title.split(' (Part ')[0];
    const related = blocks.filter(b => b.title.startsWith(baseTitle) && b.lane === block.lane);
    if (related.length > 1) {
      const sorted = [...related].sort((a,b) => a.startTime - b.startTime);
      const first = sorted[0];
      const merged: TimeBlock = { 
        ...first, 
        title: baseTitle, 
        duration: sorted.reduce((acc, curr) => acc + curr.duration, 0) 
      };
      const others = sorted.slice(1).map(s => s.id);
      recordChange(blocks.filter(b => !others.includes(b.id)).map(b => b.id === first.id ? merged : b));
    } else {
      handleUpdateBlock({...block, title: baseTitle});
    }
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
             <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border dark:border-slate-700">
                <button onClick={handleUndo} disabled={undoStack.length === 0} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-500 disabled:opacity-25 transition-all" title="Undo (Ctrl+Z)"><Undo2 size={16} /></button>
                <button onClick={handleRedo} disabled={redoStack.length === 0} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-500 disabled:opacity-25 transition-all" title="Redo (Ctrl+Y)"><Redo2 size={16} /></button>
             </div>

             <div className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl border dark:border-slate-700/50">
                <button onClick={() => setZoom(Math.max(0.4, zoom - 0.1))} className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-500"><ZoomOut size={14} /></button>
                <span className="text-[10px] font-bold text-slate-400 min-w-[36px] text-center">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(Math.min(3, zoom + 0.1))} className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-500"><ZoomIn size={14} /></button>
             </div>

             <div className="flex items-center gap-2 border-l dark:border-slate-800 pl-4">
                <button onClick={() => setIsDonateOpen(true)} className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-pink-50 dark:bg-pink-900/20 text-pink-600 hover:bg-pink-100 border border-pink-100 shadow-sm"><Heart size={16} fill="currentColor" />Donate</button>
                <button onClick={handleShare} disabled={isShortening} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${shareFeedback ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white'}`}>
                  {shareFeedback ? <Check size={16} /> : <Share2 size={16} />}
                  <span className="hidden sm:inline">{shareFeedback ? 'Copied' : (isShortening ? '...' : 'Share')}</span>
                </button>
                <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 transition-colors">
                  {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <button onClick={() => { if(confirm('Reset Workspace?')) { setBlocks([]); setUndoStack([]); setRedoStack([]); } }} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors rounded-xl" title="Reset"><RotateCcw size={18} /></button>
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
            history={history}
            onTakeSnapshot={() => takeSnapshot()}
            onRestoreSnapshot={restoreSnapshot}
            onDeleteSnapshot={(id) => setHistory(prev => prev.filter(s => s.id !== id))}
          />
        </aside>

        <div className={`flex-1 flex flex-col min-w-0 h-full ${mobileTab === 'timeline' ? 'flex' : 'hidden lg:flex'}`}>
           <div className="flex-1 overflow-hidden relative">
              <Timeline 
                ref={timelineRef}
                blocks={blocks} categories={categories} profiles={profiles}
                onUpdateBlock={handleUpdateBlock} 
                onDeleteBlock={(id) => handleDeleteBlocks([id])} 
                onSelectBlock={(id, multi) => setSelectedBlockIds(prev => multi ? (prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]) : [id])} 
                onSelectBlocks={setSelectedBlockIds}
                selectedBlockIds={selectedBlockIds} 
                lunchRule={lunchRule} eveningRule={eveningRule}
                onSplitBlock={handleSplitBlock} onMergeBlocks={handleMergeBlocks}
                fontSize={12} zoom={zoom} isFullScreen={isCenterFullScreen} onToggleFullScreen={() => setIsCenterFullScreen(!isCenterFullScreen)}
                onAddBlockAtPosition={handleAddBlockAtPosition}
              />
              {isAiGenerating && (
                <div className="absolute inset-0 bg-white/60 dark:bg-dark-bg/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-6">
                   <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin"></div>
                   <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">Optimizing Schedule...</h2>
                </div>
              )}
           </div>
        </div>

        <aside 
          className={`${!isMobile ? 'lg:flex lg:relative' : (mobileTab === 'detail' ? 'flex flex-1' : 'hidden')} ${isCenterFullScreen ? 'hidden' : ''} h-full bg-white dark:bg-dark-surface border-l dark:border-dark-border shrink-0 overflow-hidden relative`}
          style={!isMobile ? { width: isRightPanelOpen ? rightWidth : 56 } : {}}
        >
          <DetailPanel 
            blocks={selectedBlocks} allBlocks={blocks} categories={categories} resources={resources}
            onUpdate={handleUpdateBlock} onClose={() => setSelectedBlockIds([])}
            isOpen={isRightPanelOpen || mobileTab === 'detail'}
            onToggle={() => setIsRightPanelOpen(!isRightPanelOpen)}
            onDeleteSelected={() => handleDeleteBlocks(selectedBlockIds)}
            onDuplicateSelected={() => handleDuplicateBlocks(selectedBlockIds)}
          />
        </aside>
      </main>

      {isDonateOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={() => setIsDonateOpen(false)}>
           <div className="bg-white dark:bg-dark-surface p-8 rounded-3xl shadow-2xl max-w-sm w-full relative flex flex-col items-center border dark:border-dark-border" onClick={e => e.stopPropagation()}>
              <button onClick={() => setIsDonateOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 rounded-xl transition-colors"><X size={20} /></button>
              <Heart size={48} fill="#f472b6" className="text-pink-400 mb-6" />
              <h3 className="text-xl font-bold mb-4">Support Chronos Flow</h3>
              <div className="bg-white p-4 rounded-2xl shadow-inner border">
                 <img src="https://img2.pic.in.th/267263.jpg" alt="Thai QR" className="w-64 h-auto rounded-lg mx-auto" />
              </div>
              <p className="mt-6 text-[11px] text-slate-400 text-center font-medium">Scan with any Thai mobile banking app. Thank you!</p>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;

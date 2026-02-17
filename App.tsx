
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TimeBlock, ProfileBlock, Category, Resource, LunchBreakRule, EveningBreakRule, Snapshot } from './types';
import Sidebar from './components/Sidebar';
import Timeline, { TimelineRef } from './components/Timeline';
import DetailPanel from './components/DetailPanel';
import { INITIAL_PROFILES, INITIAL_CATEGORIES, INITIAL_RESOURCES } from './constants';
import { Layers, Moon, Sun, ZoomIn, ZoomOut, RotateCcw, Share2, Check, Undo2, Redo2, Copy, Trash2 } from 'lucide-react';
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
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [isShortening, setIsShortening] = useState(false);
  
  const [undoStack, setUndoStack] = useState<TimeBlock[][]>([]);
  const [redoStack, setRedoStack] = useState<TimeBlock[][]>([]);

  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(window.innerWidth > 1024);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(window.innerWidth > 1280);
  const [leftWidth] = useState(() => loadState('cfp_leftWidth', 260));
  const [rightWidth] = useState(() => loadState('cfp_rightWidth', 320));

  const timelineRef = useRef<TimelineRef>(null);
  const hasInitialScrolled = useRef(false);

  // Requirement: Auto-scroll to first box on mount
  useEffect(() => {
    if (blocks.length > 0 && !hasInitialScrolled.current) {
      const timer = setTimeout(() => {
        timelineRef.current?.scrollToFirstBlock();
        hasInitialScrolled.current = true;
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [blocks.length]);

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
  }, [blocks, profiles, categories, resources, lunchRule, eveningRule, history, isDarkMode, zoom]);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  // Keyboard support: DEL to delete, Ctrl+Z/Y for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedBlockIds.length > 0) {
          e.preventDefault();
          handleDeleteBlocks(selectedBlockIds);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
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
    setUndoStack(prev => [...prev, blocks].slice(-50)); 
    setRedoStack([]);
    setBlocks(newBlocks);
  }, [blocks]);

  const takeSnapshot = (name?: string) => {
    const newSnapshot: Snapshot = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      name: name || `Version ${history.length + 1}`,
      blocks,
      profiles,
      categories,
      resources,
      lunchRule,
      eveningRule
    };
    setHistory(prev => [newSnapshot, ...prev].slice(0, 30));
  };

  const restoreSnapshot = (snapshot: Snapshot) => {
    if (!confirm(`Restore to "${snapshot.name}"? Current timeline will be archived.`)) return;
    takeSnapshot(`Archive before restore`);
    setBlocks(snapshot.blocks);
    setProfiles(snapshot.profiles);
    setCategories(snapshot.categories);
    setResources(snapshot.resources);
    setLunchRule(snapshot.lunchRule);
    setEveningRule(snapshot.eveningRule);
  };

  const handleAiGenerate = async () => {
    if (isAiGenerating) return;
    takeSnapshot(`Pre-AI Backup`);
    setIsAiGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Generate an optimized industrial production schedule for 7 days.
      Return as a JSON array of TimeBlock objects.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
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
                resourceIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                lane: { type: Type.INTEGER }
              },
              required: ["id", "title", "startTime", "duration", "categoryId", "resourceIds", "lane"]
            }
          }
        }
      });

      const result = JSON.parse(response.text.trim() || '[]');
      if (Array.isArray(result) && result.length > 0) {
        recordChange(result);
        setTimeout(() => timelineRef.current?.scrollToFirstBlock(), 500);
      }
    } catch (error) {
      console.error(error);
      alert("AI Generation failed.");
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleShare = async () => {
    if (isShortening) return;
    setIsShortening(true);
    
    try {
      const state = { blocks, profiles, categories, resources, lunchRule, eveningRule };
      const longUrl = `${window.location.origin}${window.location.pathname}#share=${btoa(unescape(encodeURIComponent(JSON.stringify(state))))}`;
      let finalUrl = longUrl;
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(longUrl)}`, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          const shortened = await res.text();
          if (shortened && shortened.startsWith('http')) finalUrl = shortened;
        }
      } catch (e) { console.warn("Shortener failed, using long URL."); }

      await navigator.clipboard.writeText(finalUrl);
      setShareFeedback(true);
      setTimeout(() => setShareFeedback(false), 2000);
    } catch (err) { alert("Clipboard access denied."); }
    finally { setIsShortening(false); }
  };

  // Requirement: Scroll to first box before PDF export
  const handleExportPDF = () => {
    if (timelineRef.current) {
      timelineRef.current.scrollToFirstBlock();
      setTimeout(() => { window.print(); }, 1200);
    }
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

  const handleUpdateBlock = (updated: TimeBlock) => recordChange(blocks.map(b => b.id === updated.id ? updated : b));
  const handleDeleteBlocks = (ids: string[]) => { recordChange(blocks.filter(b => !ids.includes(b.id))); setSelectedBlockIds([]); };

  const handleDuplicateBlocks = (ids: string[]) => {
    const copies = blocks.filter(b => ids.includes(b.id)).map(b => ({
      ...b,
      id: Math.random().toString(36).substr(2, 9),
      startTime: b.startTime + 60,
      lane: b.lane + 1,
      dependencies: []
    }));
    recordChange([...blocks, ...copies]);
    setSelectedBlockIds(copies.map(c => c.id));
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
             {selectedBlockIds.length >= 1 && (
               <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border dark:border-slate-700">
                  <button onClick={() => handleDuplicateBlocks(selectedBlockIds)} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-indigo-600" title="Duplicate selected"><Copy size={16} /></button>
                  <button onClick={() => handleDeleteBlocks(selectedBlockIds)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/40 rounded-lg text-red-500" title="Delete selected"><Trash2 size={16} /></button>
               </div>
             )}

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
                <button onClick={handleShare} disabled={isShortening} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${shareFeedback ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-indigo-600 text-white shadow-indigo-500/20 hover:bg-indigo-700'} ${isShortening ? 'opacity-70 animate-pulse' : ''}`}>
                  {shareFeedback ? <Check size={16} /> : <Share2 size={16} />}
                  <span className="hidden sm:inline">{shareFeedback ? 'Copied' : (isShortening ? 'Shortening...' : 'Share')}</span>
                </button>
                <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 transition-colors">
                  {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <button onClick={() => { if(confirm('Reset workspace?')) recordChange([]); }} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors rounded-xl"><RotateCcw size={18} /></button>
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
            onAddBlockFromProfile={(p) => handleAddBlockAtPosition(p, 480, 0)} 
            lunchRule={lunchRule} onUpdateLunchRule={setLunchRule}
            eveningRule={eveningRule} onUpdateEveningRule={setEveningRule}
            isOpen={isLeftPanelOpen || mobileTab === 'sidebar'}
            onToggle={() => { if (isMobile) setMobileTab('timeline'); else setIsLeftPanelOpen(!isLeftPanelOpen); }}
            onExportCFP={() => downloadFile(JSON.stringify({blocks, profiles, categories, resources, lunchRule, eveningRule}), 'export.cfp', 'application/json')}
            onImportCFP={(f) => {
              const r = new FileReader(); r.onload = (e) => { 
                try { 
                  const d = JSON.parse(e.target?.result as string); 
                  if (d.blocks) setBlocks(d.blocks); 
                } catch(err) { alert('Invalid file format'); }
              }; r.readAsText(f);
            }}
            onExportCSV={() => downloadFile(generateCSV(blocks, categories, resources), 'schedule.csv', 'text/csv')}
            onExportPDF={handleExportPDF}
            onAiGenerate={handleAiGenerate}
            isAiGenerating={isAiGenerating}
            history={history}
            onTakeSnapshot={takeSnapshot}
            onRestoreSnapshot={restoreSnapshot}
            onDeleteSnapshot={(id) => setHistory(h => h.filter(s => s.id !== id))}
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
                onSplitBlock={(id) => {
                   const b = blocks.find(x => x.id === id);
                   if (b && b.duration > 30) {
                     const h = Math.floor(b.duration / 2 / 15) * 15;
                     const p1 = { ...b, duration: h, title: `${b.title} (Part 1)` };
                     const p2 = { ...b, id: Math.random().toString(36).substr(2, 9), startTime: b.startTime + h, duration: b.duration - h, title: `${b.title} (Part 2)` };
                     recordChange(blocks.map(x => x.id === id ? p1 : x).concat(p2));
                   }
                }}
                onMergeBlocks={(id) => {
                   const b = blocks.find(x => x.id === id);
                   if (b && b.title.includes(' (Part ')) {
                      const base = b.title.split(' (Part ')[0];
                      const partners = blocks.filter(x => x.title.startsWith(base) && x.lane === b.lane);
                      if (partners.length > 1) {
                        const first = [...partners].sort((a,b) => a.startTime - b.startTime)[0];
                        const totalDur = partners.reduce((acc, curr) => acc + curr.duration, 0);
                        const others = partners.filter(x => x.id !== first.id).map(x => x.id);
                        recordChange(blocks.filter(x => !others.includes(x.id)).map(x => x.id === first.id ? { ...first, title: base, duration: totalDur } : x));
                      }
                   }
                }}
                fontSize={12} zoom={zoom} isFullScreen={isCenterFullScreen} onToggleFullScreen={() => setIsCenterFullScreen(!isCenterFullScreen)}
                onAddBlockAtPosition={handleAddBlockAtPosition}
              />
              {isAiGenerating && (
                <div className="absolute inset-0 bg-white/60 dark:bg-dark-bg/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-6">
                   <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin"></div>
                   <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">Architecting Schedule...</h2>
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
    </div>
  );
};

export default App;

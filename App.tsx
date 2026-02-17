
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { TimeBlock, ProfileBlock, Category, Resource, LunchBreakRule, EveningBreakRule, Snapshot } from './types';
import Sidebar from './components/Sidebar';
import Timeline, { TimelineRef } from './components/Timeline';
import DetailPanel from './components/DetailPanel';
import { START_HOUR, END_HOUR, INITIAL_PROFILES, INITIAL_CATEGORIES, INITIAL_RESOURCES, DAYS_IN_WEEK } from './constants';
import { Layers, Moon, Sun, ZoomIn, ZoomOut, Library, LayoutGrid, Settings2, RotateCcw, Plus, Share2, Check, Heart, X, Sparkles, Copy, Trash2, Undo2, Redo2, History, AlertTriangle } from 'lucide-react';
import { downloadFile, generateCSV, findResourceConflicts } from './utils';
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
  
  const [undoStack, setUndoStack] = useState<TimeBlock[][]>([]);
  const [redoStack, setRedoStack] = useState<TimeBlock[][]>([]);

  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(window.innerWidth > 1024);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(window.innerWidth > 1280);
  const [leftWidth, setLeftWidth] = useState(() => loadState('cfp_leftWidth', 260));
  const [rightWidth, setRightWidth] = useState(() => loadState('cfp_rightWidth', 320));

  const timelineRef = useRef<TimelineRef>(null);
  const resizingRef = useRef<'left' | 'right' | null>(null);

  const conflicts = useMemo(() => findResourceConflicts(blocks), [blocks]);

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

  // Command History Logic
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
      name: name || `Revision ${history.length + 1}`,
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
    recordChange(blocks); // Save current to undo stack
    setBlocks(snapshot.blocks);
    setProfiles(snapshot.profiles);
    setCategories(snapshot.categories);
    setResources(snapshot.resources);
    setLunchRule(snapshot.lunchRule);
    setEveningRule(snapshot.eveningRule);
  };

  const handleAiGenerate = async () => {
    if (isAiGenerating) return;
    takeSnapshot(`Auto-Checkpoint: AI Generation`);
    setIsAiGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `System Unit Architect: Generate an optimal 7-day schedule for a manufacturing facility.
      Total Minutes: 10080. 
      Templates: ${JSON.stringify(profiles.map(p => ({ id: p.id, name: p.name, dur: p.defaultDuration, res: p.resourceIds })))}
      Categories: ${JSON.stringify(categories)}
      Equipment List: ${JSON.stringify(resources.map(r => r.id))}
      Break Logic: Lunch (${JSON.stringify(lunchRule)}), Evening (${JSON.stringify(eveningRule)})
      Rules: No resource conflicts. Autoclave starts must be staggered by 30 mins. 
      Distribute across 8-10 parallel lanes.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          systemInstruction: "Output a valid JSON array of TimeBlock objects. Use provided IDs.",
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
                dependencies: { type: Type.ARRAY, items: { type: Type.STRING } },
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
        setTimeout(() => timelineRef.current?.scrollToFirstBlock(), 300);
      }
    } catch (error) {
      console.error("AI Generation Error", error);
      alert("Failed to synthesize schedule. Ensure equipment IDs are unique.");
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleShare = async () => {
    setIsShortening(true);
    try {
      const state = { blocks, profiles, categories, resources, lunchRule, eveningRule };
      const longUrl = `${window.location.origin}${window.location.pathname}#share=${btoa(unescape(encodeURIComponent(JSON.stringify(state))))}`;
      let finalUrl = longUrl;
      const res = await fetch(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(longUrl)}`);
      if (res.ok) finalUrl = await res.text();
      
      await navigator.clipboard.writeText(finalUrl);
      setShareFeedback(true);
      setTimeout(() => setShareFeedback(false), 2000);
    } catch (e) {
      console.error("Link shortening failed", e);
      // Fallback to clipboard long URL
      const longUrl = `${window.location.origin}${window.location.pathname}#share=${btoa(unescape(encodeURIComponent(JSON.stringify({ blocks, profiles, categories, resources, lunchRule, eveningRule }))))}`;
      await navigator.clipboard.writeText(longUrl);
      setShareFeedback(true);
      setTimeout(() => setShareFeedback(false), 2000);
    } finally {
      setIsShortening(false);
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
  const handleDeleteBlocks = (ids: string[]) => {
    if (ids.length === 0) return;
    recordChange(blocks.filter(b => !ids.includes(b.id)));
    setSelectedBlockIds([]);
  };

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

  // Split logic based on user rules
  const handleAutoSplit = (id: string) => {
    const b = blocks.find(x => x.id === id);
    if (!b) return;
    const end = b.startTime + b.duration;
    
    // Check lunch
    if (lunchRule.enabled && b.startTime < lunchRule.endTime && end > lunchRule.startTime) {
       const firstDur = lunchRule.startTime - b.startTime;
       const secondDur = end - lunchRule.startTime;
       if (firstDur < 15 || secondDur < 15) return; // Too small
       
       const p1 = { ...b, duration: firstDur, title: `${b.title} (Am)` };
       const p2 = { ...b, id: Math.random().toString(36).substr(2, 9), startTime: lunchRule.endTime, duration: secondDur - (lunchRule.endTime - lunchRule.startTime), title: `${b.title} (Pm)` };
       recordChange(blocks.map(x => x.id === id ? p1 : x).concat(p2));
    }
  };

  const isMobile = window.innerWidth < 1024;
  const selectedBlocks = blocks.filter(b => selectedBlockIds.includes(b.id));

  return (
    <div className="h-screen bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-slate-100 flex flex-col overflow-hidden select-none transition-colors duration-300">
      {!isCenterFullScreen && (
        <nav className="h-14 lg:h-16 bg-white dark:bg-dark-surface border-b dark:border-dark-border px-4 lg:px-6 flex items-center justify-between z-[60] shrink-0 shadow-sm no-print">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20"><Layers size={18} /></div>
            <h1 className="hidden sm:block text-sm lg:text-lg font-bold tracking-tight">Chronos Flow Pro</h1>
          </div>
          
          <div className="flex items-center gap-2 lg:gap-4">
             {conflicts.size > 0 && (
               <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl border border-red-100 dark:border-red-900/30 text-[10px] font-black tracking-widest animate-pulse">
                  <AlertTriangle size={14} /> {conflicts.size} Resource Violations
               </div>
             )}

             <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border dark:border-slate-700">
                <button onClick={handleUndo} disabled={undoStack.length === 0} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-500 disabled:opacity-25 transition-all" title="Undo (Ctrl+Z)"><Undo2 size={16} /></button>
                <button onClick={handleRedo} disabled={redoStack.length === 0} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-500 disabled:opacity-25 transition-all" title="Redo (Ctrl+Y)"><Redo2 size={16} /></button>
             </div>

             <div className="hidden lg:flex items-center gap-1 border-l dark:border-slate-800 pl-4">
                <button onClick={handleShare} disabled={isShortening} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${shareFeedback ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-500/20'}`}>
                  {shareFeedback ? <Check size={16} /> : <Share2 size={16} />}
                  <span className="hidden sm:inline">{shareFeedback ? 'Link Ready' : (isShortening ? 'Shortening...' : 'Share')}</span>
                </button>
                <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 transition-colors">
                  {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <button onClick={() => { if(confirm('Clear all units?')) { recordChange([]); } }} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors rounded-xl"><RotateCcw size={18} /></button>
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
            onAddBlockFromProfile={(p) => handleAddBlockAtPosition(p, 0, 0)} 
            lunchRule={lunchRule} onUpdateLunchRule={setLunchRule}
            eveningRule={eveningRule} onUpdateEveningRule={setEveningRule}
            isOpen={isLeftPanelOpen || mobileTab === 'sidebar'}
            onToggle={() => { if (isMobile) setMobileTab('timeline'); else setIsLeftPanelOpen(!isLeftPanelOpen); }}
            onExportCFP={() => downloadFile(JSON.stringify({blocks, profiles, categories, resources, lunchRule, eveningRule}), 'chronos_export.cfp', 'application/json')}
            onImportCFP={(f) => {
              const r = new FileReader(); r.onload = (e) => { 
                try { 
                  const d = JSON.parse(e.target?.result as string); 
                  takeSnapshot('Pre-Import Checkpoint');
                  if (d.blocks) setBlocks(d.blocks);
                  if (d.profiles) setProfiles(d.profiles);
                  alert('Configuration loaded successfully.');
                } catch(err) { alert('Failed to parse CFP file.'); }
              }; r.readAsText(f);
            }}
            onExportCSV={() => downloadFile(generateCSV(blocks, categories, resources), 'schedule.csv', 'text/csv')}
            onExportPDF={() => window.print()}
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
                onSplitBlock={handleAutoSplit}
                onMergeBlocks={(id) => {
                  const b = blocks.find(x => x.id === id);
                  if (b?.title.includes(' (')) {
                    const base = b.title.split(' (')[0];
                    const siblings = blocks.filter(x => x.title.startsWith(base) && x.lane === b.lane);
                    if (siblings.length > 1) {
                      const first = [...siblings].sort((a,b) => a.startTime - b.startTime)[0];
                      const totalD = siblings.reduce((acc, curr) => acc + curr.duration, 0);
                      const others = siblings.filter(x => x.id !== first.id).map(x => x.id);
                      recordChange(blocks.filter(x => !others.includes(x.id)).map(x => x.id === first.id ? { ...first, title: base, duration: totalD } : x));
                    }
                  }
                }}
                fontSize={12} zoom={zoom} isFullScreen={isCenterFullScreen} onToggleFullScreen={() => setIsCenterFullScreen(!isCenterFullScreen)}
                onAddBlockAtPosition={handleAddBlockAtPosition}
              />
              {isAiGenerating && (
                <div className="absolute inset-0 bg-white/70 dark:bg-dark-bg/70 backdrop-blur-md z-[100] flex flex-col items-center justify-center gap-8 animate-in fade-in duration-500">
                   <div className="relative">
                      <div className="w-24 h-24 border-4 border-indigo-500/10 border-t-indigo-600 rounded-full animate-spin"></div>
                      <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-500 animate-pulse" size={32} />
                   </div>
                   <div className="text-center">
                      <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest mb-1">Synthesizing</h2>
                      <p className="text-sm text-slate-400 font-medium animate-pulse">Gemini 3 Pro is generating your flow...</p>
                   </div>
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
           <div className="bg-white dark:bg-dark-surface p-8 rounded-[40px] shadow-2xl max-w-sm w-full relative flex flex-col items-center border dark:border-dark-border" onClick={e => e.stopPropagation()}>
              <button onClick={() => setIsDonateOpen(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-red-500 rounded-xl transition-colors"><X size={24} /></button>
              <div className="w-16 h-16 bg-pink-100 dark:bg-pink-900/30 text-pink-600 rounded-full flex items-center justify-center mb-6"><Heart size={32} fill="currentColor" /></div>
              <h3 className="text-2xl font-black mb-2 tracking-tight">Support Open Source</h3>
              <p className="text-sm text-slate-500 text-center mb-8 px-4 leading-relaxed">If this tool accelerates your planning, consider a small donation to keep the servers running.</p>
              <div className="bg-white p-6 rounded-3xl shadow-inner border-2 border-slate-100">
                 <img src="https://img2.pic.in.th/267263.jpg" alt="Thai QR" className="w-64 h-auto rounded-xl mx-auto" />
              </div>
              <p className="mt-8 text-[10px] text-slate-400 text-center font-black uppercase tracking-[0.2em]">Thai PromptPay QR</p>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;

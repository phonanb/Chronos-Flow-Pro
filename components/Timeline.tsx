
import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { TimeBlock, LunchBreakRule, EveningBreakRule, Category, ProfileBlock } from '../types';
import { START_HOUR, END_HOUR, DAYS_IN_WEEK, MINUTES_IN_HOUR, PIXELS_PER_MINUTE, COLOR_MAP } from '../constants';
import { formatTime, findResourceConflicts, getMaxLane } from '../utils';
import { Scissors, Trash2, Boxes, LayoutGrid, Merge, Maximize2, Minimize2, Coffee, Moon } from 'lucide-react';

interface TimelineProps {
  blocks: TimeBlock[];
  categories: Category[];
  profiles: ProfileBlock[];
  onUpdateBlock: (block: TimeBlock) => void;
  onDeleteBlock: (id: string) => void;
  onSelectBlock: (blockId: string) => void;
  selectedBlockId: string | null;
  lunchRule: LunchBreakRule;
  eveningRule: EveningBreakRule;
  onSplitBlock: (blockId: string) => void;
  onMergeBlocks: (blockId: string) => void;
  fontSize: number;
  zoom: number;
  isFullScreen: boolean;
  onToggleFullScreen: () => void;
  onAddBlockAtPosition: (profile: ProfileBlock, startTime: number, lane: number) => void;
}

const Timeline: React.FC<TimelineProps> = ({ 
  blocks, 
  categories,
  profiles,
  onUpdateBlock, 
  onDeleteBlock, 
  onSelectBlock,
  selectedBlockId,
  lunchRule,
  eveningRule,
  onSplitBlock,
  onMergeBlocks,
  fontSize,
  zoom,
  isFullScreen,
  onToggleFullScreen,
  onAddBlockAtPosition
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [draggingBlock, setDraggingBlock] = useState<{ id: string, initialX: number, initialY: number, initialStart: number, initialLane: number } | null>(null);

  // 7 Days of Hours
  const days = Array.from({ length: DAYS_IN_WEEK }, (_, i) => i);
  const hoursPerDay = Array.from({ length: 24 }, (_, i) => i);
  
  const resourceConflicts = useMemo(() => findResourceConflicts(blocks), [blocks]);
  
  const currentPPM = PIXELS_PER_MINUTE * zoom;
  const laneSize = 160 * zoom; 
  const HEADER_HEIGHT = 80; // Day + Hour header height

  const startDrag = (clientX: number, clientY: number, block: TimeBlock) => {
    if (block.isLocked) return;
    setDraggingBlock({ 
      id: block.id, 
      initialX: clientX, 
      initialY: clientY, 
      initialStart: block.startTime,
      initialLane: block.lane 
    });
    onSelectBlock(block.id);
  };

  const moveDrag = useCallback((clientX: number, clientY: number) => {
    if (!draggingBlock || !scrollContainerRef.current) return;
    
    const deltaX = clientX - draggingBlock.initialX;
    const deltaY = clientY - draggingBlock.initialY;
    
    const block = blocks.find(b => b.id === draggingBlock.id);
    if (!block) return;

    // Time Axis Movement (Snap to 15 mins)
    const timeDelta = Math.round(deltaX / currentPPM / 15) * 15;
    // Limit to 7 days
    const maxMinutes = DAYS_IN_WEEK * 24 * 60;
    const newStart = Math.max(0, Math.min(maxMinutes - block.duration, draggingBlock.initialStart + timeDelta));
    
    // Lane Axis Movement
    const laneDelta = Math.round(deltaY / laneSize);
    const newLane = Math.max(0, draggingBlock.initialLane + laneDelta);

    if (newStart !== block.startTime || newLane !== block.lane) {
      onUpdateBlock({ ...block, startTime: newStart, lane: newLane });
    }
  }, [draggingBlock, blocks, currentPPM, laneSize, onUpdateBlock]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => moveDrag(e.clientX, e.clientY);
    const handleMouseUp = () => setDraggingBlock(null);
    const handleTouchMove = (e: TouchEvent) => {
      if (draggingBlock) {
        if (e.cancelable) e.preventDefault();
        moveDrag(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const handleTouchEnd = () => setDraggingBlock(null);

    if (draggingBlock) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
      document.body.classList.add('no-scroll');
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      document.body.classList.remove('no-scroll');
    };
  }, [draggingBlock, moveDrag]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('application/json');
    if (!data || !contentRef.current) return;
    
    const profile = JSON.parse(data) as ProfileBlock;
    const rect = contentRef.current.getBoundingClientRect();
    const scrollLeft = scrollContainerRef.current?.scrollLeft || 0;
    const scrollTop = scrollContainerRef.current?.scrollTop || 0;
    
    // Position relative to contentRef's coordinate space
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert pixels to minutes and lanes
    const droppedTimeMinutes = Math.max(0, Math.floor(x / currentPPM / 15) * 15);
    const droppedLane = Math.max(0, Math.floor((y - HEADER_HEIGHT) / laneSize));
    
    onAddBlockAtPosition(profile, droppedTimeMinutes, droppedLane);
  };

  const renderArrows = () => (
    <svg className="absolute inset-0 pointer-events-none overflow-visible z-10 no-print">
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
        </marker>
      </defs>
      {blocks.map(block => block.dependencies.map(depId => {
        const dep = blocks.find(b => b.id === depId);
        if (!dep) return null;

        const depTimePos = dep.startTime * currentPPM;
        const depSize = dep.duration * currentPPM;
        const blockTimePos = block.startTime * currentPPM;
        const depLanePos = HEADER_HEIGHT + (dep.lane * laneSize);
        const blockLanePos = HEADER_HEIGHT + (block.lane * laneSize);

        const xStart = depTimePos + depSize;
        const yStart = depLanePos + (laneSize / 2);
        const xEnd = blockTimePos;
        const yEnd = blockLanePos + (laneSize / 2);

        const pathData = `M ${xStart} ${yStart} C ${xStart + (40 * zoom)} ${yStart}, ${xEnd - (40 * zoom)} ${yEnd}, ${xEnd} ${yEnd}`;
        const isViolation = dep.startTime + dep.duration > block.startTime;

        return (
          <path key={`${depId}-${block.id}`} d={pathData} fill="none" 
            stroke={isViolation ? "#f87171" : "#94a3b8"} 
            strokeWidth={1.5 * zoom} 
            markerEnd="url(#arrowhead)" 
            strokeDasharray={isViolation ? "4" : "0"}
            className={isViolation ? "animate-pulse" : "opacity-40"}
          />
        );
      }))}
    </svg>
  );

  const contentWidth = DAYS_IN_WEEK * 24 * 60 * currentPPM + (400 * zoom);
  const contentHeight = (Math.max(getMaxLane(blocks), 10) + 5) * laneSize + (400 * zoom);
  const gridHourWidth = 60 * currentPPM;

  return (
    <div className={`h-full flex flex-col bg-white dark:bg-dark-surface overflow-hidden timeline-container ${isFullScreen ? 'fixed inset-0 z-[100]' : ''}`}>
      <header className="p-3 lg:p-4 border-b dark:border-dark-border flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/40 z-50 shrink-0 no-print">
        <div className="flex items-center gap-3">
           <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-lg"><LayoutGrid size={16} /></div>
           <div>
              <h2 className="text-[10px] lg:text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-[0.2em]">7-Day Operational Timeline</h2>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Global Manufacturing Schedule</p>
           </div>
        </div>
        <div className="flex items-center gap-2 lg:gap-4">
           {resourceConflicts.size > 0 && (
             <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 px-2 lg:px-3 py-1 lg:py-1.5 rounded-xl text-[9px] lg:text-[10px] font-bold border border-red-100 dark:border-red-900/40 uppercase tracking-widest">
               Conflict Detected
             </div>
           )}
           <button onClick={onToggleFullScreen} className="p-2 lg:p-2.5 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl text-slate-500 transition-all shadow-sm">
             {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
           </button>
        </div>
      </header>

      <div 
        ref={scrollContainerRef} 
        className="flex-1 overflow-auto custom-scrollbar relative"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div 
          ref={contentRef}
          style={{ 
            width: contentWidth, 
            height: contentHeight, 
            minWidth: '100%', 
            minHeight: '100%',
            backgroundImage: `linear-gradient(to right, rgba(148, 163, 184, 0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(148, 163, 184, 0.1) 1px, transparent 1px)`,
            backgroundSize: `${gridHourWidth}px ${laneSize}px`,
            backgroundPosition: `0px ${HEADER_HEIGHT}px`
          }}
          className="relative"
        >
          {renderArrows()}
          
          <div className="flex sticky top-0 z-40 bg-white/95 dark:bg-dark-surface/95 border-b dark:border-dark-border">
            {days.map(day => (
              <div key={day} className="flex flex-col border-r dark:border-dark-border" style={{ width: 24 * 60 * currentPPM }}>
                <div className="py-1 text-center bg-indigo-50/50 dark:bg-indigo-900/20 text-[10px] font-black uppercase tracking-[0.4em] text-indigo-600 dark:text-indigo-400 border-b dark:border-dark-border">
                  Day {day + 1}
                </div>
                <div className="flex">
                  {hoursPerDay.map(hour => (
                    <div key={hour} className="relative flex items-center justify-center border-r dark:border-dark-border last:border-r-0" style={{ width: gridHourWidth, height: 48 }}>
                       <span className="text-[9px] font-bold text-slate-400">{hour % 12 || 12} {hour >= 12 ? 'PM' : 'AM'}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="absolute top-0 left-0 bottom-0 right-0 z-20 pointer-events-none">
            {blocks.map(block => {
              const timePos = block.startTime * currentPPM;
              const timeSize = block.duration * currentPPM;
              const lanePos = HEADER_HEIGHT + (block.lane * laneSize);
              const isSelected = selectedBlockId === block.id;
              const category = categories.find(c => c.id === block.categoryId);
              const colorClass = COLOR_MAP[category?.color || 'slate'];
              const hasResourceConflict = resourceConflicts.has(block.id);
              const isPart = block.title.includes(' (Part ');

              return (
                <div
                  key={block.id}
                  title={block.title}
                  onMouseDown={(e) => { e.stopPropagation(); startDrag(e.clientX, e.clientY, block); }}
                  onTouchStart={(e) => { e.stopPropagation(); startDrag(e.touches[0].clientX, e.touches[0].clientY, block); }}
                  className={`absolute rounded-xl border-l-[6px] p-2 sm:p-3 shadow-sm transition-all cursor-grab active:cursor-grabbing group pointer-events-auto overflow-hidden
                    ${colorClass} 
                    ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-2 z-50 scale-[1.01] shadow-xl' : 'z-30 hover:shadow-lg'}
                    ${hasResourceConflict ? 'border-red-600 ring-2 ring-red-500/20 shadow-lg shadow-red-500/10' : ''}
                    ${block.isLocked ? 'cursor-not-allowed opacity-90' : ''}
                  `}
                  style={{ left: timePos, top: lanePos, width: timeSize, height: laneSize - (16 * zoom), minWidth: '12px', touchAction: 'none' }}
                >
                  <div className="flex flex-col justify-between h-full">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold truncate leading-tight print:text-black" style={{ fontSize: `${Math.max(10, fontSize * zoom)}px` }}>{block.title}</h3>
                        <p className="text-[8px] sm:text-[9px] font-bold opacity-40 uppercase truncate print:opacity-100 print:text-slate-600">{category?.name}</p>
                      </div>
                      <div className="flex gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity no-print">
                        {isPart && !block.isLocked && <button onClick={(e) => { e.stopPropagation(); onMergeBlocks(block.id); }} className="p-1 hover:bg-white/50 rounded text-indigo-600"><Merge size={14 * zoom} /></button>}
                        {!isPart && !block.isLocked && <button onClick={(e) => { e.stopPropagation(); onSplitBlock(block.id); }} className="p-1 hover:bg-white/50 rounded"><Scissors size={14 * zoom} /></button>}
                        <button onClick={(e) => { e.stopPropagation(); onDeleteBlock(block.id); }} className="p-1 hover:bg-white/50 rounded"><Trash2 size={14 * zoom} /></button>
                      </div>
                    </div>
                    <div className="flex justify-between items-end">
                       <p className="font-mono font-bold opacity-60 text-[9px] print:opacity-100 print:text-slate-700">{formatTime(block.startTime)} • {block.duration}m</p>
                       {hasResourceConflict && <Boxes size={14 * zoom} className="text-red-600 animate-pulse" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {days.map(day => (
            <React.Fragment key={`breaks-${day}`}>
              {lunchRule.enabled && (
                <div className="absolute bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/20 pointer-events-none z-10 border-x h-full top-0"
                  style={{ 
                    left: (day * 24 * 60 + lunchRule.startTime) * currentPPM, 
                    width: (lunchRule.endTime - lunchRule.startTime) * currentPPM 
                  }}
                >
                  <div className="absolute top-24 left-2 flex items-center gap-1.5 opacity-60">
                    <Coffee size={10} className="text-amber-600" />
                  </div>
                </div>
              )}

              {eveningRule.enabled && (
                <div className="absolute bg-indigo-500/5 dark:bg-indigo-500/10 border-indigo-500/20 pointer-events-none z-10 border-x h-full top-0"
                  style={{ 
                    left: (day * 24 * 60 + eveningRule.startTime) * currentPPM, 
                    width: (eveningRule.endTime - eveningRule.startTime) * currentPPM 
                  }}
                >
                  <div className="absolute top-24 left-2 flex items-center gap-1.5 opacity-60">
                    <Moon size={10} className="text-indigo-600" />
                  </div>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Timeline;

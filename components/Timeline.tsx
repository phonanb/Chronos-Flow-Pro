
import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { TimeBlock, LunchBreakRule, Category, Orientation } from '../types';
import { START_HOUR, END_HOUR, MINUTES_IN_HOUR, PIXELS_PER_MINUTE, COLOR_MAP } from '../constants';
import { formatTime, findResourceConflicts, getMaxLane } from '../utils';
import { Scissors, Trash2, Boxes, Info, LayoutGrid, Merge, Maximize2, Minimize2 } from 'lucide-react';

interface TimelineProps {
  blocks: TimeBlock[];
  categories: Category[];
  onUpdateBlock: (block: TimeBlock) => void;
  onDeleteBlock: (id: string) => void;
  onSelectBlock: (blockId: string) => void;
  selectedBlockId: string | null;
  lunchRule: LunchBreakRule;
  onSplitBlock: (blockId: string) => void;
  onMergeBlocks: (blockId: string) => void;
  orientation: Orientation;
  fontSize: number;
  zoom: number;
  isFullScreen: boolean;
  onToggleFullScreen: () => void;
}

const Timeline: React.FC<TimelineProps> = ({ 
  blocks, 
  categories,
  onUpdateBlock, 
  onDeleteBlock, 
  onSelectBlock,
  selectedBlockId,
  lunchRule,
  onSplitBlock,
  onMergeBlocks,
  orientation,
  fontSize,
  zoom,
  isFullScreen,
  onToggleFullScreen
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [draggingBlock, setDraggingBlock] = useState<{ id: string, initialX: number, initialY: number, initialStart: number, initialLane: number } | null>(null);

  const isLandscape = orientation === 'landscape';
  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
  const resourceConflicts = useMemo(() => findResourceConflicts(blocks), [blocks]);
  
  const currentPPM = PIXELS_PER_MINUTE * zoom;
  const laneSize = 160 * zoom; 
  // Standardized header size to match Tailwind h-16 / w-16 (64px)
  const HEADER_OFFSET = 64;

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

  const handleMouseDown = (e: React.MouseEvent, block: TimeBlock) => {
    e.stopPropagation();
    startDrag(e.clientX, e.clientY, block);
  };

  const handleTouchStart = (e: React.TouchEvent, block: TimeBlock) => {
    e.stopPropagation();
    const touch = e.touches[0];
    startDrag(touch.clientX, touch.clientY, block);
  };

  const moveDrag = useCallback((clientX: number, clientY: number) => {
    if (!draggingBlock || !scrollContainerRef.current) return;
    
    const deltaX = clientX - draggingBlock.initialX;
    const deltaY = clientY - draggingBlock.initialY;
    
    const block = blocks.find(b => b.id === draggingBlock.id);
    if (!block) return;

    // Time Axis Movement (Snap to 15 mins)
    // In Landscape: X is time. In Portrait: Y is time.
    const timeDelta = Math.round((isLandscape ? deltaX : deltaY) / currentPPM / 15) * 15;
    const newStart = Math.max(START_HOUR * 60, Math.min(END_HOUR * 60 - block.duration, draggingBlock.initialStart + timeDelta));
    
    // Lane Axis Movement
    // In Landscape: Y is lane. In Portrait: X is lane.
    const laneDelta = Math.round((isLandscape ? deltaY : deltaX) / laneSize);
    const newLane = Math.max(0, draggingBlock.initialLane + laneDelta);

    if (newStart !== block.startTime || newLane !== block.lane) {
      onUpdateBlock({ ...block, startTime: newStart, lane: newLane });
    }
  }, [draggingBlock, blocks, currentPPM, laneSize, isLandscape, onUpdateBlock]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    moveDrag(e.clientX, e.clientY);
  }, [moveDrag]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (draggingBlock) {
      if (e.cancelable) e.preventDefault();
      const touch = e.touches[0];
      moveDrag(touch.clientX, touch.clientY);
    }
  }, [draggingBlock, moveDrag]);

  const endDrag = useCallback(() => {
    setDraggingBlock(null);
  }, []);

  useEffect(() => {
    if (draggingBlock) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', endDrag);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', endDrag);
      document.body.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', endDrag);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', endDrag);
    };
  }, [draggingBlock, handleMouseMove, handleTouchMove, endDrag]);

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

        const depTimePos = (dep.startTime - START_HOUR * 60) * currentPPM;
        const depSize = dep.duration * currentPPM;
        const blockTimePos = (block.startTime - START_HOUR * 60) * currentPPM;
        const depLanePos = HEADER_OFFSET + (dep.lane * laneSize);
        const blockLanePos = HEADER_OFFSET + (block.lane * laneSize);

        let xStart, yStart, xEnd, yEnd;
        if (!isLandscape) {
          xStart = depLanePos + (laneSize / 2);
          yStart = depTimePos + depSize;
          xEnd = blockLanePos + (laneSize / 2);
          yEnd = blockTimePos;
        } else {
          xStart = depTimePos + depSize;
          yStart = depLanePos + (laneSize / 2);
          xEnd = blockTimePos;
          yEnd = blockLanePos + (laneSize / 2);
        }

        const pathData = isLandscape 
          ? `M ${xStart} ${yStart} C ${xStart + (40 * zoom)} ${yStart}, ${xEnd - (40 * zoom)} ${yEnd}, ${xEnd} ${yEnd}`
          : `M ${xStart} ${yStart} C ${xStart} ${yStart + (40 * zoom)}, ${xEnd} ${yEnd - (40 * zoom)}, ${xEnd} ${yEnd}`;

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

  const contentWidth = isLandscape 
    ? (END_HOUR - START_HOUR + 1) * MINUTES_IN_HOUR * currentPPM + (150 * zoom)
    : (getMaxLane(blocks) + 1) * laneSize + (100 * zoom);
    
  const contentHeight = isLandscape 
    ? (getMaxLane(blocks) + 1) * laneSize + (100 * zoom)
    : (END_HOUR - START_HOUR + 1) * MINUTES_IN_HOUR * currentPPM + (150 * zoom);

  const gridW = isLandscape ? (60 * currentPPM) : laneSize;
  const gridH = isLandscape ? laneSize : (60 * currentPPM);

  return (
    <div className={`h-full flex flex-col bg-white dark:bg-dark-surface overflow-hidden timeline-container ${isFullScreen ? 'fixed inset-0 z-[100]' : ''}`}>
      <header className="p-3 lg:p-4 border-b dark:border-dark-border flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/40 z-50 shrink-0 no-print">
        <div className="flex items-center gap-3">
           <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-lg"><LayoutGrid size={16} /></div>
           <div>
              <h2 className="text-[10px] lg:text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-[0.2em]">Operational Timeline</h2>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{formatTime(START_HOUR * 60)} — {formatTime(END_HOUR * 60)}</p>
           </div>
        </div>
        <div className="flex items-center gap-2 lg:gap-4">
           {resourceConflicts.size > 0 && (
             <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 px-2 lg:px-3 py-1 lg:py-1.5 rounded-xl text-[9px] lg:text-[10px] font-bold border border-red-100 dark:border-red-900/40 uppercase tracking-widest">
               Conflict
             </div>
           )}
           <button onClick={onToggleFullScreen} className="p-2 lg:p-2.5 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl text-slate-500 transition-all shadow-sm">
             {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
           </button>
        </div>
      </header>

      <div 
        ref={scrollContainerRef} 
        className="flex-1 overflow-auto custom-scrollbar relative timeline-grid" 
        style={{ 
          backgroundSize: `${gridW}px ${gridH}px`,
          // Align background position exactly to header size
          backgroundPosition: `${isLandscape ? 0 : HEADER_OFFSET}px ${isLandscape ? HEADER_OFFSET : 0}px` 
        }}
      >
        <div style={{ width: contentWidth, height: contentHeight, minWidth: '100%', minHeight: '100%' }} className="relative">
          {renderArrows()}
          
          <div className={`${isLandscape ? "flex" : "flex flex-col"} sticky top-0 left-0 z-40`}>
            {hours.map(hour => (
              <div key={hour} className="relative" style={{ [isLandscape ? 'width' : 'height']: 60 * currentPPM }}>
                <div className={`${isLandscape ? "w-full text-center py-2 h-16" : "w-16 h-full flex items-center justify-end pr-3"} text-[10px] font-bold text-slate-400 bg-white/95 dark:bg-dark-surface/95 backdrop-blur-sm border-b border-r dark:border-dark-border`}>
                  {formatTime(hour * 60)}
                </div>
              </div>
            ))}
          </div>

          <div className="absolute top-0 left-0 bottom-0 right-0 z-20 pointer-events-none">
            {blocks.map(block => {
              const timePos = (block.startTime - START_HOUR * 60) * currentPPM;
              const timeSize = block.duration * currentPPM;
              const lanePos = HEADER_OFFSET + (block.lane * laneSize);
              const isSelected = selectedBlockId === block.id;
              const category = categories.find(c => c.id === block.categoryId);
              const colorClass = COLOR_MAP[category?.color || 'slate'];
              const hasResourceConflict = resourceConflicts.has(block.id);
              const isPart = block.title.includes(' (Part ');

              const style = isLandscape 
                ? { left: timePos, top: lanePos, width: timeSize, height: laneSize - (16 * zoom), minWidth: '12px' }
                : { top: timePos, left: lanePos, height: timeSize, width: laneSize - (16 * zoom), minHeight: '12px' };

              return (
                <div
                  key={block.id}
                  onMouseDown={(e) => handleMouseDown(e, block)}
                  onTouchStart={(e) => handleTouchStart(e, block)}
                  className={`absolute rounded-xl border-l-[6px] p-2 sm:p-3 shadow-sm transition-all cursor-grab active:cursor-grabbing group pointer-events-auto overflow-hidden
                    ${colorClass} 
                    ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-2 z-50 scale-[1.01] shadow-xl' : 'z-30 hover:shadow-lg'}
                    ${hasResourceConflict ? 'border-red-500 ring-2 ring-red-500/20' : ''}
                    ${block.isLocked ? 'cursor-not-allowed opacity-90' : ''}
                  `}
                  style={{...style, touchAction: 'none'}}
                >
                  <div className="flex flex-col justify-between h-full">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold truncate leading-tight" style={{ fontSize: `${Math.max(10, fontSize * zoom)}px` }}>{block.title}</h3>
                        <p className="text-[8px] sm:text-[9px] font-bold opacity-40 uppercase truncate">{category?.name}</p>
                      </div>
                      <div className="flex gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity no-print">
                        {isPart && !block.isLocked && <button onClick={(e) => { e.stopPropagation(); onMergeBlocks(block.id); }} className="p-1 hover:bg-white/50 rounded text-indigo-600"><Merge size={14 * zoom} /></button>}
                        {!isPart && !block.isLocked && <button onClick={(e) => { e.stopPropagation(); onSplitBlock(block.id); }} className="p-1 hover:bg-white/50 rounded"><Scissors size={14 * zoom} /></button>}
                        <button onClick={(e) => { e.stopPropagation(); onDeleteBlock(block.id); }} className="p-1 hover:bg-white/50 rounded"><Trash2 size={14 * zoom} /></button>
                      </div>
                    </div>
                    <div className="flex justify-between items-end">
                       <p className="font-mono font-bold opacity-60 text-[9px]">{formatTime(block.startTime)} • {block.duration}m</p>
                       {hasResourceConflict && <Boxes size={14 * zoom} className="text-red-600 animate-pulse" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {lunchRule.enabled && (
            <div className={`absolute bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/20 pointer-events-none z-10 ${isLandscape ? "border-x h-full top-0" : "border-y w-full left-0"}`}
              style={{ 
                [isLandscape ? 'left' : 'top']: (lunchRule.startTime - START_HOUR * 60) * currentPPM, 
                [isLandscape ? 'width' : 'height']: (lunchRule.endTime - lunchRule.startTime) * currentPPM 
              }}
            >
              <div className="absolute top-2 left-2 flex items-center gap-1.5 opacity-60">
                <div className="p-1 bg-amber-500 text-white rounded"><LayoutGrid size={8} /></div>
                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-amber-600">Break Window</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Timeline;

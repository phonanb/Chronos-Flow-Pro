
import React, { useRef, useState, useEffect, useMemo, useCallback, useImperativeHandle, forwardRef } from 'react';
import { TimeBlock, LunchBreakRule, EveningBreakRule, Category, ProfileBlock, GroupTemplate } from '../types';
import { START_HOUR, END_HOUR, DAYS_IN_WEEK, MINUTES_IN_HOUR, PIXELS_PER_MINUTE, COLOR_MAP } from '../constants';
import { formatTime, findResourceConflicts, getMaxLane } from '../utils';
import { Scissors, Trash2, Boxes, LayoutGrid, Merge, Maximize2, Minimize2, Coffee, Moon, MousePointer2 } from 'lucide-react';

export interface TimelineRef {
  scrollToFirstBlock: () => void;
}

interface DragState {
  initialMouseX: number;
  initialMouseY: number;
  initialPositions: Map<string, { startTime: number, lane: number }>;
  moved: boolean;
}

interface TimelineProps {
  blocks: TimeBlock[];
  categories: Category[];
  profiles: ProfileBlock[];
  groupTemplates: GroupTemplate[];
  onUpdateBlock: (block: TimeBlock) => void;
  onUpdateBlocksBulk: (blocks: TimeBlock[]) => void;
  onDeleteBlock: (id: string) => void;
  onSelectBlock: (blockId: string, multi: boolean) => void;
  onSelectBlocks: (blockIds: string[]) => void;
  selectedBlockIds: string[];
  lunchRule: LunchBreakRule;
  eveningRule: EveningBreakRule;
  onSplitBlock: (blockId: string) => void;
  onMergeBlocks: (blockId: string) => void;
  fontSize: number;
  zoom: number;
  isFullScreen: boolean;
  onToggleFullScreen: () => void;
  onAddBlockAtPosition: (profile: ProfileBlock, startTime: number, lane: number) => void;
  onAddGroupAtPosition: (template: GroupTemplate, startTime: number, lane: number) => void;
}

const Timeline = forwardRef<TimelineRef, TimelineProps>(({ 
  blocks, 
  categories,
  profiles,
  groupTemplates,
  onUpdateBlock, 
  onUpdateBlocksBulk,
  onDeleteBlock, 
  onSelectBlock,
  onSelectBlocks,
  selectedBlockIds,
  lunchRule,
  eveningRule,
  onSplitBlock,
  onMergeBlocks,
  fontSize,
  zoom,
  isFullScreen,
  onToggleFullScreen,
  onAddBlockAtPosition,
  onAddGroupAtPosition
}, ref) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [selectionRect, setSelectionRect] = useState<{ startX: number, startY: number, currentX: number, currentY: number } | null>(null);

  const currentPPM = PIXELS_PER_MINUTE * zoom;
  const laneSize = 160 * zoom; 
  const HEADER_HEIGHT = 80;

  const scrollToFirstBlock = useCallback(() => {
    if (blocks.length === 0 || !scrollContainerRef.current) return;
    const minStart = Math.min(...blocks.map(b => b.startTime));
    const scrollPos = (minStart * currentPPM) - (100 * zoom);
    scrollContainerRef.current.scrollTo({ 
      left: Math.max(0, scrollPos), 
      behavior: 'smooth' 
    });
  }, [blocks, currentPPM, zoom]);

  useImperativeHandle(ref, () => ({
    scrollToFirstBlock
  }));

  const startDrag = (clientX: number, clientY: number, block: TimeBlock, isShift: boolean) => {
    if (block.isLocked) return;

    let targetIds = selectedBlockIds;
    if (!selectedBlockIds.includes(block.id)) {
      if (isShift) {
        targetIds = [...selectedBlockIds, block.id];
        onSelectBlocks(targetIds);
      } else {
        targetIds = [block.id];
        onSelectBlocks(targetIds);
      }
    }

    const positions = new Map<string, { startTime: number, lane: number }>();
    blocks.forEach(b => {
      if (targetIds.includes(b.id)) {
        positions.set(b.id, { startTime: b.startTime, lane: b.lane });
      }
    });

    setDragState({ 
      initialMouseX: clientX, 
      initialMouseY: clientY, 
      initialPositions: positions,
      moved: false
    });
  };

  const startSelection = (clientX: number, clientY: number) => {
    if (!contentRef.current) return;
    const rect = contentRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    setSelectionRect({ startX: x, startY: y, currentX: x, currentY: y });
    onSelectBlocks([]);
  };

  const moveSelection = useCallback((clientX: number, clientY: number) => {
    if (!selectionRect || !contentRef.current) return;
    const rect = contentRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    const newRect = { ...selectionRect, currentX: x, currentY: y };
    setSelectionRect(newRect);

    const x1 = Math.min(newRect.startX, newRect.currentX);
    const x2 = Math.max(newRect.startX, newRect.currentX);
    const y1 = Math.min(newRect.startY, newRect.currentY);
    const y2 = Math.max(newRect.startY, newRect.currentY);

    const selectedIds = blocks.filter(block => {
      const bX1 = block.startTime * currentPPM;
      const bX2 = bX1 + block.duration * currentPPM;
      const bY1 = HEADER_HEIGHT + block.lane * laneSize;
      const bY2 = bY1 + laneSize;
      
      return bX1 < x2 && bX2 > x1 && bY1 < y2 && bY2 > y1;
    }).map(b => b.id);

    onSelectBlocks(selectedIds);
  }, [selectionRect, blocks, currentPPM, laneSize, onSelectBlocks]);

  const moveDrag = useCallback((clientX: number, clientY: number) => {
    if (!dragState || !scrollContainerRef.current) return;
    
    const deltaX = clientX - dragState.initialMouseX;
    const deltaY = clientY - dragState.initialMouseY;
    
    if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
      if (!dragState.moved) {
         setDragState(prev => prev ? { ...prev, moved: true } : null);
      }
    }

    const timeDeltaRaw = Math.round(deltaX / currentPPM / 15) * 15;
    const laneDeltaRaw = Math.round(deltaY / laneSize);

    // Calculate group boundaries to prevent crunching at 0 bounds
    const initialPositionsArray = Array.from(dragState.initialPositions.values());
    const minStart = Math.min(...initialPositionsArray.map(p => p.startTime));
    const minLane = Math.min(...initialPositionsArray.map(p => p.lane));
    
    // Restrict deltas so the leading edge of the group never goes below 0
    const timeDelta = Math.max(-minStart, timeDeltaRaw);
    const laneDelta = Math.max(-minLane, laneDeltaRaw);

    const maxMinutes = DAYS_IN_WEEK * 24 * 60;
    const updatedBlocks: TimeBlock[] = [];

    dragState.initialPositions.forEach((initial, id) => {
      const b = blocks.find(blk => blk.id === id);
      if (!b || b.isLocked) return;

      const newStart = Math.max(0, Math.min(maxMinutes - b.duration, initial.startTime + timeDelta));
      const newLane = Math.max(0, initial.lane + laneDelta);

      if (newStart !== b.startTime || newLane !== b.lane) {
        updatedBlocks.push({ ...b, startTime: newStart, lane: newLane });
      }
    });

    if (updatedBlocks.length > 0) {
      onUpdateBlocksBulk(updatedBlocks);
    }
  }, [dragState, blocks, currentPPM, laneSize, onUpdateBlocksBulk]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragState) moveDrag(e.clientX, e.clientY);
      else if (selectionRect) moveSelection(e.clientX, e.clientY);
    };
    const handleMouseUp = () => {
      setDragState(null);
      setSelectionRect(null);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, selectionRect, moveDrag, moveSelection]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dataString = e.dataTransfer.getData('application/json');
    if (!dataString || !contentRef.current) return;
    
    const data = JSON.parse(dataString);
    const rect = contentRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const droppedTimeMinutes = Math.max(0, Math.floor(x / currentPPM / 15) * 15);
    const droppedLane = Math.max(0, Math.floor((y - HEADER_HEIGHT) / laneSize));
    
    if (data.blocks) {
      onAddGroupAtPosition(data as GroupTemplate, droppedTimeMinutes, droppedLane);
    } else {
      onAddBlockAtPosition(data as ProfileBlock, droppedTimeMinutes, droppedLane);
    }
  };

  const resourceConflicts = useMemo(() => findResourceConflicts(blocks), [blocks]);

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
           {selectedBlockIds.length > 0 && (
             <div className="flex items-center gap-2 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-xl text-[10px] font-bold border border-indigo-100 dark:border-indigo-900/40 uppercase tracking-widest">
               <MousePointer2 size={12} /> {selectedBlockIds.length} Selected
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
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              startSelection(e.clientX, e.clientY);
            }
          }}
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

          {selectionRect && (
            <div 
              className="absolute border-2 border-indigo-500 bg-indigo-500/10 z-[100] pointer-events-none"
              style={{
                left: Math.min(selectionRect.startX, selectionRect.currentX),
                top: Math.min(selectionRect.startY, selectionRect.currentY),
                width: Math.abs(selectionRect.startX - selectionRect.currentX),
                height: Math.abs(selectionRect.startY - selectionRect.currentY)
              }}
            />
          )}
          
          <div className="flex sticky top-0 z-40 bg-white/95 dark:bg-dark-surface/95 border-b dark:border-dark-border">
            {Array.from({ length: DAYS_IN_WEEK }).map((_, day) => (
              <div key={day} className="flex flex-col border-r dark:border-dark-border" style={{ width: 24 * 60 * currentPPM }}>
                <div className="py-1 text-center bg-indigo-50/50 dark:bg-indigo-900/20 text-[10px] font-black uppercase tracking-[0.4em] text-indigo-600 dark:text-indigo-400 border-b dark:border-dark-border">
                  Day {day + 1}
                </div>
                <div className="flex">
                  {Array.from({ length: 24 }).map((_, hour) => (
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
              const isSelected = selectedBlockIds.includes(block.id);
              const category = categories.find(c => c.id === block.categoryId);
              const colorClass = COLOR_MAP[category?.color || 'slate'];
              const hasResourceConflict = resourceConflicts.has(block.id);
              const isPart = block.title.includes(' (Part ');

              return (
                <div
                  key={block.id}
                  title={block.title}
                  onMouseDown={(e) => { e.stopPropagation(); startDrag(e.clientX, e.clientY, block, e.shiftKey); }}
                  className={`absolute rounded-xl border-l-[6px] p-2 sm:p-3 shadow-sm transition-all cursor-grab active:cursor-grabbing group pointer-events-auto overflow-hidden
                    ${colorClass} 
                    ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-2 z-50 scale-[1.01] shadow-xl' : 'z-30 hover:shadow-lg'}
                    ${hasResourceConflict ? 'border-red-600 ring-2 ring-red-500/20 shadow-lg shadow-red-500/10' : ''}
                    ${block.isLocked ? 'cursor-not-allowed opacity-90' : ''}
                  `}
                  style={{ left: timePos, top: lanePos, width: timeSize, height: laneSize - (16 * zoom), minWidth: '12px' }}
                >
                  <div className="flex flex-col justify-between h-full">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold truncate leading-tight print:text-black" style={{ fontSize: `${Math.max(10, fontSize * zoom)}px` }}>{block.title}</h3>
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

          {Array.from({ length: DAYS_IN_WEEK }).map((_, day) => (
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
});

export default Timeline;

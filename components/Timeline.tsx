
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { TimeBlock, LunchBreakRule, Category, Orientation } from '../types';
import { START_HOUR, END_HOUR, MINUTES_IN_HOUR, PIXELS_PER_MINUTE, COLOR_MAP } from '../constants';
import { formatTime, findResourceConflicts, getMaxLane } from '../utils';
import { Scissors, Trash2, Boxes, Info } from 'lucide-react';

interface TimelineProps {
  blocks: TimeBlock[];
  categories: Category[];
  onUpdateBlock: (block: TimeBlock) => void;
  onDeleteBlock: (id: string) => void;
  onSelectBlock: (blockId: string) => void;
  selectedBlockId: string | null;
  lunchRule: LunchBreakRule;
  onSplitBlock: (blockId: string) => void;
  orientation: Orientation;
  fontSize: number;
  zoom: number;
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
  orientation,
  fontSize,
  zoom
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [draggingBlock, setDraggingBlock] = useState<{ id: string, initialX: number, initialY: number, initialStart: number, initialLane: number } | null>(null);

  const isLandscape = orientation === 'landscape';
  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
  const resourceConflicts = useMemo(() => findResourceConflicts(blocks), [blocks]);
  
  // Calculate scaled values based on zoom
  const currentPPM = PIXELS_PER_MINUTE * zoom;
  const laneSize = 150 * zoom; 

  const handleMouseDown = (e: React.MouseEvent, block: TimeBlock) => {
    if (block.isLocked) return;
    e.stopPropagation();
    setDraggingBlock({ 
      id: block.id, 
      initialX: e.clientX, 
      initialY: e.clientY, 
      initialStart: block.startTime,
      initialLane: block.lane 
    });
    onSelectBlock(block.id);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!draggingBlock || !timelineRef.current) return;
    
    const deltaX = e.clientX - draggingBlock.initialX;
    const deltaY = e.clientY - draggingBlock.initialY;
    
    const block = blocks.find(b => b.id === draggingBlock.id);
    if (!block) return;

    // Time Axis Movement (Snap to 15 mins)
    const timeDelta = Math.round((isLandscape ? deltaX : deltaY) / currentPPM / 15) * 15;
    const newStart = Math.max(START_HOUR * 60, Math.min(END_HOUR * 60 - block.duration, draggingBlock.initialStart + timeDelta));
    
    // Lane Axis Movement
    const laneDelta = Math.round((isLandscape ? deltaY : deltaX) / laneSize);
    const newLane = Math.max(0, draggingBlock.initialLane + laneDelta);

    if (newStart !== block.startTime || newLane !== block.lane) {
      onUpdateBlock({ ...block, startTime: newStart, lane: newLane });
    }
  };

  const handleMouseUp = () => setDraggingBlock(null);

  useEffect(() => {
    if (draggingBlock) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingBlock]);

  const renderArrows = () => {
    return (
      <svg className="absolute inset-0 pointer-events-none overflow-visible z-10 no-print">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
          </marker>
        </defs>
        {blocks.map(block => {
          return block.dependencies.map(depId => {
            const dep = blocks.find(b => b.id === depId);
            if (!dep) return null;

            let xStart, yStart, xEnd, yEnd;
            const depTimePos = (dep.startTime - START_HOUR * 60) * currentPPM;
            const depSize = dep.duration * currentPPM;
            const blockTimePos = (block.startTime - START_HOUR * 60) * currentPPM;
            const depLanePos = 64 * zoom + (dep.lane * laneSize);
            const blockLanePos = 64 * zoom + (block.lane * laneSize);

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

            return (
              <path key={`${depId}-${block.id}`} d={pathData} fill="none" stroke="#94a3b8" strokeWidth={1.5 * zoom} markerEnd="url(#arrowhead)" 
                strokeDasharray={dep.startTime + dep.duration > block.startTime ? "4" : "0"}
                className={dep.startTime + dep.duration > block.startTime ? "stroke-red-400" : "opacity-40 dark:opacity-60"}
              />
            );
          });
        })}
      </svg>
    );
  };

  const contentWidth = isLandscape 
    ? (END_HOUR - START_HOUR + 1) * MINUTES_IN_HOUR * currentPPM + (200 * zoom)
    : (getMaxLane(blocks) + 2) * laneSize;
    
  const contentHeight = isLandscape 
    ? (getMaxLane(blocks) + 2) * laneSize
    : (END_HOUR - START_HOUR + 1) * MINUTES_IN_HOUR * currentPPM + (200 * zoom);

  return (
    <div className={`timeline-container relative flex-1 bg-white dark:bg-dark-surface border dark:border-dark-border rounded-xl shadow-sm overflow-hidden flex flex-col h-full ${!isLandscape ? 'min-w-[400px]' : ''}`}>
      <div className="p-4 border-b dark:border-dark-border flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/20 z-50 no-print">
        <div className="flex items-center gap-2">
           <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight">Daily Units</h2>
           <div className="text-[10px] text-slate-400 font-mono">SCROLL TO NAVIGATE • {Math.round(zoom * 100)}% ZOOM</div>
        </div>
        <div className="flex gap-4">
           {resourceConflicts.size > 0 && (
             <div className="flex items-center gap-1.5 text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded text-[10px] font-bold animate-pulse">
               <Boxes size={12} /> Conflict
             </div>
           )}
        </div>
      </div>

      <div 
        ref={timelineRef} 
        className="flex-1 overflow-auto custom-scrollbar relative p-4 timeline-grid" 
        style={{ 
          backgroundSize: `${isLandscape ? (60 * currentPPM) : (laneSize)}px ${isLandscape ? (laneSize) : (60 * currentPPM)}px`
        }}
      >
        <div style={{ width: contentWidth, height: contentHeight }} className="relative">
          {renderArrows()}
          
          {/* Hour markers */}
          <div className={isLandscape ? "flex" : "flex flex-col"}>
            {hours.map(hour => (
              <div key={hour} className={`relative group ${isLandscape ? "" : ""}`} style={{ [isLandscape ? 'width' : 'height']: 60 * currentPPM }}>
                <div className={`${isLandscape ? "absolute top-0 left-0 w-full text-center py-1" : "w-14 text-right pr-2 sticky left-0"} text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-sm z-40 uppercase`}>
                  {formatTime(hour * 60)}
                </div>
              </div>
            ))}
          </div>

          {/* Blocks container */}
          <div className="absolute top-0 left-0 bottom-0 right-0 z-20 pointer-events-none">
            {blocks.map(block => {
              const timePos = (block.startTime - START_HOUR * 60) * currentPPM;
              const timeSize = block.duration * currentPPM;
              const lanePos = (64 * zoom) + (block.lane * laneSize);
              const isSelected = selectedBlockId === block.id;
              const category = categories.find(c => c.id === block.categoryId);
              const colorClass = COLOR_MAP[category?.color || 'slate'];
              const hasResourceConflict = resourceConflicts.has(block.id);

              const style = isLandscape 
                ? { left: timePos, top: lanePos, width: timeSize, height: laneSize - (10 * zoom), minWidth: '10px' }
                : { top: timePos, left: lanePos, height: timeSize, width: laneSize - (10 * zoom), minHeight: '10px' };

              return (
                <div
                  key={block.id}
                  onMouseDown={(e) => handleMouseDown(e, block)}
                  title={block.originalTitle ? `Original: ${block.originalTitle}` : undefined}
                  className={`absolute rounded-lg border-l-4 p-2 shadow-sm transition-shadow cursor-move select-none group pointer-events-auto overflow-hidden
                    ${colorClass} 
                    ${isSelected ? 'ring-2 ring-blue-500 dark:ring-blue-400 ring-offset-1 dark:ring-offset-dark-surface z-50' : 'z-30 hover:shadow-md'}
                    ${hasResourceConflict ? 'border-red-600 dark:border-red-400 ring-1 ring-red-400' : ''}
                  `}
                  style={style}
                >
                  <div className="flex justify-between items-start h-full flex-col">
                    <div className="w-full flex justify-between items-start">
                      <h3 className="font-bold truncate leading-tight flex items-center gap-1" style={{ fontSize: `${fontSize * zoom}px` }}>
                        {block.title}
                        {block.originalTitle && <Info size={10 * zoom} className="opacity-50 no-print shrink-0" />}
                      </h3>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity no-print shrink-0">
                        <button onClick={(e) => { e.stopPropagation(); onSplitBlock(block.id); }} className="p-0.5 hover:bg-white/50 rounded text-amber-600"><Scissors size={10 * zoom} /></button>
                        <button onClick={(e) => { e.stopPropagation(); onDeleteBlock(block.id); }} className="p-0.5 hover:bg-white/50 rounded text-red-600"><Trash2 size={10 * zoom} /></button>
                      </div>
                    </div>
                    <div className="w-full flex justify-between items-end mt-1">
                       <p className="opacity-70 font-bold whitespace-nowrap" style={{ fontSize: `${fontSize * 0.75 * zoom}px` }}>{formatTime(block.startTime)} ({block.duration}m)</p>
                       {hasResourceConflict && <Boxes size={12 * zoom} className="text-red-600 dark:text-red-400 shrink-0" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Lunch Break Indicator */}
          {lunchRule.enabled && (
            <div className={`absolute bg-yellow-50/20 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-900/50 pointer-events-none z-10 ${isLandscape ? "border-x h-full top-0" : "border-y w-full left-0"}`}
              style={{ 
                [isLandscape ? 'left' : 'top']: (lunchRule.startTime - START_HOUR * 60) * currentPPM, 
                [isLandscape ? 'width' : 'height']: (lunchRule.endTime - lunchRule.startTime) * currentPPM 
              }}
            >
              <div className="text-[8px] text-yellow-600 dark:text-yellow-400/50 font-bold px-2 py-1 opacity-40 uppercase tracking-widest">Lunch Break</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Timeline;

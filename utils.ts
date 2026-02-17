
import { TimeBlock, Category, Resource } from './types';

export const formatTime = (minutes: number): string => {
  const day = Math.floor(minutes / (24 * 60)) + 1;
  const h = Math.floor((minutes % (24 * 60)) / 60);
  const m = minutes % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  return `D${day} ${displayH}:${m.toString().padStart(2, '0')} ${ampm}`;
};

export const checkOverlaps = (start1: number, end1: number, start2: number, end2: number): boolean => {
  return start1 < end2 && start2 < end1;
};

/**
 * Production-ready conflict detection.
 * Identifies resource over-utilization and specific staggered start violations.
 */
export const findResourceConflicts = (blocks: TimeBlock[]) => {
  const conflicts = new Set<string>();
  
  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      const b1 = blocks[i];
      const b2 = blocks[j];
      
      const start1 = b1.startTime;
      const end1 = b1.startTime + b1.duration;
      const start2 = b2.startTime;
      const end2 = b2.startTime + b2.duration;

      // 1. Resource Overlap (Same equipment at the same time)
      const sharedResources = b1.resourceIds.filter(id => b2.resourceIds.includes(id));
      if (sharedResources.length > 0 && checkOverlaps(start1, end1, start2, end2)) {
        conflicts.add(b1.id);
        conflicts.add(b2.id);
        continue;
      }

      // 2. Specialized Staggered Logic (e.g., Autoclaves)
      // If two units use different physical units of the same family (like Auto A and Auto B),
      // their start times must be offset by 30 mins to avoid peak power/load issues.
      const isAutoA1 = b1.resourceIds.includes('res-auto-a');
      const isAutoB1 = b1.resourceIds.includes('res-auto-b');
      const isAutoA2 = b2.resourceIds.includes('res-auto-a');
      const isAutoB2 = b2.resourceIds.includes('res-auto-b');

      if ((isAutoA1 && isAutoB2) || (isAutoB1 && isAutoA2)) {
        if (Math.abs(b1.startTime - b2.startTime) < 30) {
          conflicts.add(b1.id);
          conflicts.add(b2.id);
        }
      }
    }
  }
  return conflicts;
};

export const reorder = <T,>(list: T[], startIndex: number, endIndex: number): T[] => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
};

export const getMaxLane = (blocks: TimeBlock[]): number => {
  return Math.max(0, ...blocks.map(b => b.lane)) + 1;
};

export const downloadFile = (content: string, fileName: string, contentType: string) => {
  const a = document.createElement('a');
  const file = new Blob([content], { type: contentType });
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
};

export const generateCSV = (blocks: TimeBlock[], categories: Category[], resources: Resource[]) => {
  const headers = ['ID', 'Title', 'Category', 'Start Day', 'Start Time', 'Duration (m)', 'Lanes', 'Equipment'];
  const rows = blocks.map(b => {
    const category = categories.find(c => c.id === b.categoryId)?.name || 'N/A';
    const equipment = b.resourceIds.map(rid => resources.find(r => r.id === rid)?.name).join('; ');
    const day = Math.floor(b.startTime / 1440) + 1;
    return [
      b.id,
      `"${b.title}"`,
      category,
      day,
      formatTime(b.startTime),
      b.duration,
      b.lane,
      `"${equipment}"`
    ];
  });
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
};

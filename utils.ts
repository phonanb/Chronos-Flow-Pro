
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

      // Rule 1: Standard Shared Resource Conflict (Same resource at the same time)
      const sharedResources = b1.resourceIds.filter(id => b2.resourceIds.includes(id));
      if (sharedResources.length > 0 && checkOverlaps(start1, end1, start2, end2)) {
        conflicts.add(b1.id);
        conflicts.add(b2.id);
        continue;
      }

      // Rule 2: Special Autoclave A and B Delay Rule (Must have 30m gap)
      const isAutoA1 = b1.resourceIds.includes('res-auto-a');
      const isAutoB1 = b1.resourceIds.includes('res-auto-b');
      const isAutoA2 = b2.resourceIds.includes('res-auto-a');
      const isAutoB2 = b2.resourceIds.includes('res-auto-b');

      const involvesAandB = (isAutoA1 && isAutoB2) || (isAutoB1 && isAutoA2);
      
      if (involvesAandB) {
        // Condition for valid: end1 + 30 <= start2 OR end2 + 30 <= start1
        // Conflict if NOT valid
        const gapConflict = !(end1 + 30 <= start2 || end2 + 30 <= start1);
        if (gapConflict) {
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

// --- Export Helpers ---

export const downloadFile = (content: string, fileName: string, contentType: string) => {
  const a = document.createElement('a');
  const file = new Blob([content], { type: contentType });
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
};

export const generateCSV = (blocks: TimeBlock[], categories: Category[], resources: Resource[]) => {
  const headers = ['ID', 'Title', 'Category', 'Start Time', 'Duration (m)', 'Lanes', 'Equipment'];
  const rows = blocks.map(b => {
    const category = categories.find(c => c.id === b.categoryId)?.name || 'N/A';
    const equipment = b.resourceIds.map(rid => resources.find(r => r.id === rid)?.name).join('; ');
    return [
      b.id,
      `"${b.title}"`,
      category,
      formatTime(b.startTime),
      b.duration,
      b.lane,
      `"${equipment}"`
    ];
  });
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
};

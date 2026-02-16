
export interface Category {
  id: string;
  name: string;
  color: string; // Tailwind class prefix like 'blue'
}

export interface Resource {
  id: string;
  name: string;
  description: string;
}

export interface TimeBlock {
  id: string;
  title: string;
  originalTitle?: string; // Track original template/task name for splits
  description: string;
  startTime: number; // Minutes from start of day
  duration: number;  // Duration in minutes
  categoryId: string;
  dependencies: string[]; // IDs of blocks that must finish before this starts
  resourceIds: string[];  // IDs of global resources/equipment used
  prerequisites: string[];
  color: string;
  isLocked: boolean;
  lane: number; // Manual lane positioning (row in landscape)
}

export interface ProfileBlock {
  id: string;
  name: string;
  categoryId: string;
  defaultDuration: number;
  color: string;
  resourceIds: string[];
}

export interface LunchBreakRule {
  enabled: boolean;
  startTime: number;
  endTime: number;
}

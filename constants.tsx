
import { Category, Resource } from './types';

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-work', name: 'Work', color: 'blue' },
  { id: 'cat-health', name: 'Health', color: 'emerald' },
  { id: 'cat-personal', name: 'Personal', color: 'purple' },
  { id: 'cat-learning', name: 'Learning', color: 'amber' },
  { id: 'cat-chores', name: 'Chores', color: 'slate' },
];

export const INITIAL_RESOURCES: Resource[] = [
  { id: 'res-1', name: 'Laptop', description: 'Primary workstation' },
  { id: 'res-2', name: 'Autoclave A', description: 'Sterilization unit A' },
  { id: 'res-3', name: 'Autoclave B', description: 'Sterilization unit B' },
  { id: 'res-4', name: 'Conference Room', description: 'Main meeting space' },
];

export const START_HOUR = 6;
export const END_HOUR = 22;
export const MINUTES_IN_HOUR = 60;
export const PIXELS_PER_MINUTE = 2;

export const INITIAL_PROFILES = [
  { id: 'p1', name: 'Deep Work Session', categoryId: 'cat-work', defaultDuration: 120, color: 'blue', resourceIds: ['res-1'] },
  { id: 'p2', name: 'Exercise', categoryId: 'cat-health', defaultDuration: 45, color: 'emerald', resourceIds: [] },
  { id: 'p3', name: 'Sterilization', categoryId: 'cat-work', defaultDuration: 90, color: 'amber', resourceIds: ['res-2'] },
];

export const COLOR_MAP: Record<string, string> = {
  blue: 'bg-blue-100 border-blue-400 text-blue-700 dark:bg-blue-900/40 dark:border-blue-500 dark:text-blue-200',
  emerald: 'bg-emerald-100 border-emerald-400 text-emerald-700 dark:bg-emerald-900/40 dark:border-emerald-500 dark:text-emerald-200',
  purple: 'bg-purple-100 border-purple-400 text-purple-700 dark:bg-purple-900/40 dark:border-purple-500 dark:text-purple-200',
  amber: 'bg-amber-100 border-amber-400 text-amber-700 dark:bg-amber-900/40 dark:border-amber-500 dark:text-amber-200',
  slate: 'bg-slate-100 border-slate-400 text-slate-700 dark:bg-slate-800/40 dark:border-slate-500 dark:text-slate-200',
  red: 'bg-red-100 border-red-400 text-red-700 dark:bg-red-900/40 dark:border-red-500 dark:text-red-200',
};

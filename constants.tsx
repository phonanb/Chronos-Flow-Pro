
import { Category, Resource, ProfileBlock } from './types';

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'lot-1', name: 'Lot 1', color: 'blue' },
  { id: 'lot-2', name: 'Lot 2', color: 'emerald' },
  { id: 'lot-3', name: 'Lot 3', color: 'purple' },
];

export const INITIAL_RESOURCES: Resource[] = [
  { id: 'res-mt-a', name: 'Mixing Tank A', description: 'Mixing Tank Unit A' },
  { id: 'res-mt-b', name: 'Mixing Tank B', description: 'Mixing Tank Unit B' },
  { id: 'res-filling', name: 'Filling', description: 'Filling Line' },
  { id: 'res-auto-a', name: 'Autoclave A', description: 'Sterilization Unit A' },
  { id: 'res-auto-b', name: 'Autoclave B', description: 'Sterilization Unit B' },
  { id: 'res-leak', name: 'Leak tester', description: 'Leak Testing Equipment' },
  { id: 'res-avi', name: 'AVI', description: 'Automatic Visual Inspection' },
  { id: 'res-packing', name: 'Packing', description: 'Packaging Area' },
];

// 7 Days Timeline
export const DAYS_IN_WEEK = 7;
export const START_HOUR = 0;
export const END_HOUR = 23;
export const MINUTES_IN_HOUR = 60;
export const PIXELS_PER_MINUTE = 2;

export const INITIAL_PROFILES: ProfileBlock[] = [
  { id: 'p-mt-a', name: 'Mixing Tank A', categoryId: 'lot-1', defaultDuration: 120, color: 'blue', resourceIds: ['res-mt-a'] },
  { id: 'p-mt-b', name: 'Mixing Tank B', categoryId: 'lot-1', defaultDuration: 120, color: 'blue', resourceIds: ['res-mt-b'] },
  { id: 'p-filling', name: 'Filling', categoryId: 'lot-1', defaultDuration: 180, color: 'emerald', resourceIds: ['res-filling'] },
  { id: 'p-auto-a', name: 'Autoclave A', categoryId: 'lot-1', defaultDuration: 150, color: 'purple', resourceIds: ['res-auto-a'] },
  { id: 'p-auto-b', name: 'Autoclave B', categoryId: 'lot-1', defaultDuration: 150, color: 'purple', resourceIds: ['res-auto-b'] },
  { id: 'p-leak-avi', name: 'Leaktest&AVI', categoryId: 'lot-1', defaultDuration: 120, color: 'amber', resourceIds: ['res-leak', 'res-avi'] },
  { id: 'p-packing', name: 'Packing', categoryId: 'lot-1', defaultDuration: 180, color: 'slate', resourceIds: ['res-packing'] },
];

export const COLOR_MAP: Record<string, string> = {
  blue: 'bg-blue-100 border-blue-400 text-blue-700 dark:bg-blue-900/40 dark:border-blue-500 dark:text-blue-200 print:bg-blue-200 print:border-blue-600 print:text-blue-900',
  emerald: 'bg-emerald-100 border-emerald-400 text-emerald-700 dark:bg-emerald-900/40 dark:border-emerald-500 dark:text-emerald-200 print:bg-emerald-200 print:border-emerald-600 print:text-emerald-900',
  purple: 'bg-purple-100 border-purple-400 text-purple-700 dark:bg-purple-900/40 dark:border-purple-500 dark:text-purple-200 print:bg-purple-200 print:border-purple-600 print:text-purple-900',
  amber: 'bg-amber-100 border-amber-400 text-amber-700 dark:bg-amber-900/40 dark:border-amber-500 dark:text-amber-200 print:bg-amber-200 print:border-amber-600 print:text-amber-900',
  slate: 'bg-slate-100 border-slate-400 text-slate-700 dark:bg-slate-800/40 dark:border-slate-500 dark:text-slate-200 print:bg-slate-200 print:border-slate-600 print:text-slate-900',
  red: 'bg-red-100 border-red-400 text-red-700 dark:bg-red-900/40 dark:border-red-500 dark:text-red-200 print:bg-red-200 print:border-red-600 print:text-red-900',
};

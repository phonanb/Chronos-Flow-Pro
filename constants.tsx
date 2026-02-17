
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

// 7 Days Timeline as default
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

// Expanded high contrast colors for print and UI
export const COLOR_MAP: Record<string, string> = {
  blue: 'bg-blue-100 border-blue-400 text-blue-700 dark:bg-blue-900/40 dark:border-blue-500 dark:text-blue-200 print:bg-blue-300 print:border-blue-800 print:text-blue-950',
  emerald: 'bg-emerald-100 border-emerald-400 text-emerald-700 dark:bg-emerald-900/40 dark:border-emerald-500 dark:text-emerald-200 print:bg-emerald-300 print:border-emerald-800 print:text-emerald-950',
  purple: 'bg-purple-100 border-purple-400 text-purple-700 dark:bg-purple-900/40 dark:border-purple-500 dark:text-purple-200 print:bg-purple-300 print:border-purple-800 print:text-purple-950',
  amber: 'bg-amber-100 border-amber-400 text-amber-700 dark:bg-amber-900/40 dark:border-amber-500 dark:text-amber-200 print:bg-amber-300 print:border-amber-800 print:text-amber-950',
  slate: 'bg-slate-100 border-slate-400 text-slate-700 dark:bg-slate-800/40 dark:border-slate-500 dark:text-slate-200 print:bg-slate-300 print:border-slate-800 print:text-slate-950',
  red: 'bg-red-100 border-red-400 text-red-700 dark:bg-red-900/40 dark:border-red-500 dark:text-red-200 print:bg-red-300 print:border-red-800 print:text-red-950',
  orange: 'bg-orange-100 border-orange-400 text-orange-700 dark:bg-orange-900/40 dark:border-orange-500 dark:text-orange-200 print:bg-orange-300 print:border-orange-800 print:text-orange-950',
  rose: 'bg-rose-100 border-rose-400 text-rose-700 dark:bg-rose-900/40 dark:border-rose-500 dark:text-rose-200 print:bg-rose-300 print:border-rose-800 print:text-rose-950',
  cyan: 'bg-cyan-100 border-cyan-400 text-cyan-700 dark:bg-cyan-900/40 dark:border-cyan-500 dark:text-cyan-200 print:bg-cyan-300 print:border-cyan-800 print:text-cyan-950',
  lime: 'bg-lime-100 border-lime-400 text-lime-700 dark:bg-lime-900/40 dark:border-lime-500 dark:text-lime-200 print:bg-lime-300 print:border-lime-800 print:text-lime-950',
  teal: 'bg-teal-100 border-teal-400 text-teal-700 dark:bg-teal-900/40 dark:border-teal-500 dark:text-teal-200 print:bg-teal-300 print:border-teal-800 print:text-teal-950',
  fuchsia: 'bg-fuchsia-100 border-fuchsia-400 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:border-fuchsia-500 dark:text-fuchsia-200 print:bg-fuchsia-300 print:border-fuchsia-800 print:text-fuchsia-950',
  sky: 'bg-sky-100 border-sky-400 text-sky-700 dark:bg-sky-900/40 dark:border-sky-500 dark:text-sky-200 print:bg-sky-300 print:border-sky-800 print:text-sky-950',
  indigo: 'bg-indigo-100 border-indigo-400 text-indigo-700 dark:bg-indigo-900/40 dark:border-indigo-500 dark:text-indigo-200 print:bg-indigo-300 print:border-indigo-800 print:text-indigo-950',
  pink: 'bg-pink-100 border-pink-400 text-pink-700 dark:bg-pink-900/40 dark:border-pink-500 dark:text-pink-200 print:bg-pink-300 print:border-pink-800 print:text-pink-950',
};

//
// Copyright 2025 DXOS.org
//

export type Color = {
  color: string;
  text: string;
  bg: string;
  tag: string;
};

// NOTE: Don't include blue/red which are used as system colors.
const colors: Color[] = [
  { color: 'orange', bg: 'bg-orange-500', text: 'text-orange-500', tag: 'bg-orange-300 dark:bg-orange-700' },
  { color: 'amber', bg: 'bg-amber-500', text: 'text-amber-500', tag: 'bg-amber-300 dark:bg-amber-700' },
  { color: 'yellow', bg: 'bg-yellow-500', text: 'text-yellow-500', tag: 'bg-yellow-300 dark:bg-yellow-700' },
  { color: 'lime', bg: 'bg-lime-500', text: 'text-lime-500', tag: 'bg-lime-300 dark:bg-lime-700' },
  { color: 'green', bg: 'bg-green-500', text: 'text-green-500', tag: 'bg-green-300 dark:bg-green-700' },
  { color: 'emerald', bg: 'bg-emerald-500', text: 'text-emerald-500', tag: 'bg-emerald-300 dark:bg-emerald-700' },
  { color: 'teal', bg: 'bg-teal-500', text: 'text-teal-500', tag: 'bg-teal-300 dark:bg-teal-700' },
  { color: 'cyan', bg: 'bg-cyan-500', text: 'text-cyan-500', tag: 'bg-cyan-300 dark:bg-cyan-700' },
  { color: 'sky', bg: 'bg-sky-500', text: 'text-sky-500', tag: 'bg-sky-300 dark:bg-sky-700' },
  { color: 'indigo', bg: 'bg-indigo-500', text: 'text-indigo-500', tag: 'bg-indigo-300 dark:bg-indigo-700' },
  { color: 'violet', bg: 'bg-violet-500', text: 'text-violet-500', tag: 'bg-violet-300 dark:bg-violet-700' },
  { color: 'purple', bg: 'bg-purple-500', text: 'text-purple-500', tag: 'bg-purple-300 dark:bg-purple-700' },
  { color: 'fuchsia', bg: 'bg-fuchsia-500', text: 'text-fuchsia-500', tag: 'bg-fuchsia-300 dark:bg-fuchsia-700' },
  { color: 'rose', bg: 'bg-rose-500', text: 'text-rose-500', tag: 'bg-rose-300 dark:bg-rose-700' },
  { color: 'pink', bg: 'bg-pink-500', text: 'text-pink-500', tag: 'bg-pink-300 dark:bg-pink-700' },
];

export const getHashColor = (type: string | undefined): Color => {
  if (!type) {
    return { color: 'neutral', bg: 'bg-neutral-500', text: 'text-neutral-500', tag: 'bg-neutral-300 dark:bg-neutral-700' };
  }

  const hash = type.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

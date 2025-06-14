//
// Copyright 2025 DXOS.org
//

export type Color = {
  color: string;
  text: string;
  bg: string;
};

// NOTE: Don't include blue/red which are used as system colors.
const colors: Color[] = [
  { color: 'orange', bg: 'bg-orange-500', text: 'text-orange-500' },
  { color: 'amber', bg: 'bg-amber-500', text: 'text-amber-500' },
  { color: 'yellow', bg: 'bg-yellow-500', text: 'text-yellow-500' },
  { color: 'lime', bg: 'bg-lime-500', text: 'text-lime-500' },
  { color: 'green', bg: 'bg-green-500', text: 'text-green-500' },
  { color: 'emerald', bg: 'bg-emerald-500', text: 'text-emerald-500' },
  { color: 'teal', bg: 'bg-teal-500', text: 'text-teal-500' },
  { color: 'cyan', bg: 'bg-cyan-500', text: 'text-cyan-500' },
  { color: 'sky', bg: 'bg-sky-500', text: 'text-sky-500' },
  { color: 'indigo', bg: 'bg-indigo-500', text: 'text-indigo-500' },
  { color: 'violet', bg: 'bg-violet-500', text: 'text-violet-500' },
  { color: 'purple', bg: 'bg-purple-500', text: 'text-purple-500' },
  { color: 'fuchsia', bg: 'bg-fuchsia-500', text: 'text-fuchsia-500' },
  { color: 'rose', bg: 'bg-rose-500', text: 'text-rose-500' },
  { color: 'pink', bg: 'bg-pink-500', text: 'text-pink-500' },
];

export const getHashColor = (type: string | undefined): Color => {
  if (!type) {
    return { color: 'neutral', bg: 'bg-neutral-500', text: 'text-neutral-500' };
  }

  const hash = type.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

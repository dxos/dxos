//
// Copyright 2025 DXOS.org
//

export type Color = {
  color: string;
  text: string;
  bg: string;
};

const colors: Color[] = [
  { color: 'red', bg: 'bg-red-500', text: 'text-red-500' },
  { color: 'green', bg: 'bg-green-500', text: 'text-green-500' },
  { color: 'blue', bg: 'bg-blue-500', text: 'text-blue-500' },
  { color: 'yellow', bg: 'bg-yellow-500', text: 'text-yellow-500' },
  { color: 'purple', bg: 'bg-purple-500', text: 'text-purple-500' },
  { color: 'pink', bg: 'bg-pink-500', text: 'text-pink-500' },
  { color: 'orange', bg: 'bg-orange-500', text: 'text-orange-500' },
  { color: 'violet', bg: 'bg-violet-500', text: 'text-violet-500' },
];

export const getHashColor = (type: string | undefined): Color => {
  if (!type) {
    return { color: 'neutral', bg: 'bg-neutral-500', text: 'text-neutral-500' };
  }

  const hash = type.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

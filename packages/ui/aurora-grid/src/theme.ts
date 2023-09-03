//
// Copyright 2023 DXOS.org
//

import { chromeSurface, inputSurface } from '@dxos/aurora-theme';

import { GridSlots } from './Grid';

// TODO(burdon): Integrate with aurora theme (direct dependency -- see aurora-composer, tailwind.ts).
//  See Link.tsx const { tx } = useThemeContext();
//  Reuse button fragments for hoverColors, selected, primary, etc.
export const defaultGridSlots: GridSlots = {
  root: { className: inputSurface },
  table: { className: '' },
  header: { className: [chromeSurface, 'border-b text-left font-thin opacity-90 select-none'] },
  footer: { className: [chromeSurface, 'border-t text-left font-thin opacity-90'] },
  cell: { className: 'py-0 px-1 truncate' },
  // TODO(burdon): No hover if editing.
  row: { className: 'cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 h-8' }, // TODO(burdon): Compact mode.
  focus: { className: 'ring ring-primary-600 ring-inset' },
  selected: { className: '!bg-teal-100 dark:!bg-teal-700' },
  margin: { className: 'w-2' },
};

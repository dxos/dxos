//
// Copyright 2023 DXOS.org
//

import { chromeSurface } from '@dxos/react-ui-theme';

// TODO(burdon): Remove nested classNames? Add to theme?
export type TableSlots = {
  root?: {
    className?: string | string[];
  };
  table?: {
    className?: string | string[];
  };
  header?: {
    className?: string | string[];
  };
  footer?: {
    className?: string | string[];
  };
  group?: {
    className?: string | string[];
  };
  row?: {
    className?: string | string[];
  };
  cell?: {
    className?: string | string[];
  };
  focus?: {
    className?: string | string[];
  };
  selected?: {
    className?: string | string[];
  };
  margin?: {
    className?: string | string[];
  };
};

// TODO(burdon): Change to groups.
/*
head: {
  default:
  cell:
}
row: {
  default: '',
  selected: ''
}
*/

// TODO(burdon): Scrollbar area.
// TODO(burdon): Overscroll horizontal (full width).

// TODO(burdon): Integrate with DXOS UI theme (direct dependency -- see react-ui-composer, tailwind.ts).
//  See Link.tsx const { tx } = useThemeContext();
//  Reuse button fragments for hoverColors, selected, primary, etc.
export const defaultTableSlots: TableSlots = {
  // TODO(burdon): head/body/table rows.
  header: { className: [chromeSurface, 'px-2 font-light select-none'] },
  footer: { className: [chromeSurface, 'px-2 font-light'] },
  // cell: { className: 'px-2' },
  // TODO(burdon): Compact mode.
  // TODO(burdon): No hover if editing.
  // row: { className: 'cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800' },
  group: { className: 'px-2 font-light text-xs text-left' },
  focus: { className: 'ring ring-primary-600 ring-inset' },
  selected: { className: '!bg-teal-100 dark:!bg-teal-700' },
};

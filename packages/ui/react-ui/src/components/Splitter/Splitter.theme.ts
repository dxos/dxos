//
// Copyright 2026 DXOS.org
//

import { mx } from '@dxos/ui-theme';
import { type ComponentFunction, type Theme } from '@dxos/ui-types';

export type SplitterStyleProps = {
  orientation?: 'horizontal' | 'vertical';
};

const root: ComponentFunction<SplitterStyleProps> = ({ orientation }, ...etc) =>
  mx('relative flex w-full h-full overflow-hidden', orientation === 'vertical' ? 'flex-col' : 'flex-row', ...etc);

const panel: ComponentFunction<SplitterStyleProps> = (_props, ...etc) =>
  mx('relative grid overflow-hidden min-w-0 min-h-0', ...etc);

// A grab area with a centered divider line that reveals on hover/focus, matching the react-ui-dnd
// `ResizeHandle` treatment (subtle neutral line, not the accent color). The actual extent is governed
// by `ratio`; this only renders the divider affordance.
const handle: ComponentFunction<SplitterStyleProps> = ({ orientation }, ...etc) =>
  mx(
    'group relative shrink-0 touch-none select-none',
    'before:absolute before:block before:bg-focus-ring-subtle',
    'before:transition-opacity before:duration-100 before:ease-in-out before:opacity-0 hover:before:opacity-100 focus-visible:before:opacity-100 active:before:opacity-100',
    orientation === 'vertical'
      ? 'h-2 cursor-row-resize before:inset-x-0 before:top-1/2 before:-translate-y-1/2 before:h-1.5'
      : 'w-2 cursor-col-resize before:inset-y-0 before:left-1/2 before:-translate-x-1/2 before:w-1.5',
    ...etc,
  );

export const splitterTheme: Theme<SplitterStyleProps> = {
  root,
  panel,
  handle,
};

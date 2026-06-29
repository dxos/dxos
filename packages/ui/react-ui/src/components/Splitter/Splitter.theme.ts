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

// A 7px grab area, absolutely positioned and centered on the split point (the component sets the offset),
// containing a persistent 1px divider line that brightens on hover/focus/active.
const handle: ComponentFunction<SplitterStyleProps> = ({ orientation }, ...etc) =>
  mx(
    'group absolute z-10 touch-none select-none',
    'before:absolute before:block before:bg-separator',
    'before:transition-colors before:duration-100 before:ease-in-out hover:before:bg-focus-ring-subtle focus-visible:before:bg-focus-ring-subtle active:before:bg-focus-ring-subtle',
    orientation === 'vertical'
      ? 'h-[7px] cursor-row-resize before:inset-x-0 before:top-1/2 before:-translate-y-1/2 before:h-px'
      : 'w-[7px] cursor-col-resize before:inset-y-0 before:left-1/2 before:-translate-x-1/2 before:w-px',
    ...etc,
  );

export const splitterTheme: Theme<SplitterStyleProps> = {
  root,
  panel,
  handle,
};

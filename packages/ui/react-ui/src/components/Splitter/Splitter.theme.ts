//
// Copyright 2026 DXOS.org
//

import { mx } from '@dxos/ui-theme';
import { type ComponentFunction, type Theme } from '@dxos/ui-types';

export type SplitterStyleProps = {
  orientation?: 'horizontal' | 'vertical';
};

const root: ComponentFunction<SplitterStyleProps> = ({ orientation }, ...etc) =>
  mx('relative flex dx-fill overflow-hidden', orientation === 'vertical' ? 'flex-col' : 'flex-row', ...etc);

const panel: ComponentFunction<SplitterStyleProps> = (_props, ...etc) => mx('relative grid overflow-hidden', ...etc);

// A 7px grab area sitting between the panes, containing a persistent 1px divider line that brightens
// on hover/focus/active. The negative margin cancels its own extent, so the grab area straddles the
// seam rather than taking a slice of the layout — the panes still meet, and their percentage widths
// still add up. The cursor comes from the machine, which knows the axis.
const handle: ComponentFunction<SplitterStyleProps> = ({ orientation }, ...etc) =>
  mx(
    'group relative z-10 touch-none select-none',
    'before:absolute before:block before:bg-separator',
    'before:transition-colors before:duration-100 before:ease-in-out hover:before:bg-focus-ring-subtle focus-visible:before:bg-focus-ring-subtle active:before:bg-focus-ring-subtle',
    orientation === 'vertical'
      ? 'h-[7px] -my-[3.5px] before:inset-x-0 before:top-1/2 before:-translate-y-1/2 before:h-px'
      : 'w-[7px] -mx-[3.5px] before:inset-y-0 before:left-1/2 before:-translate-x-1/2 before:w-px',
    ...etc,
  );

export const splitterTheme: Theme<SplitterStyleProps> = {
  root,
  panel,
  handle,
};

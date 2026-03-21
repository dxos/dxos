//
// Copyright 2026 DXOS.org
//

import { type AllowedAxis, type ComponentFunction, type Theme } from '@dxos/ui-types';

import { mx } from '../../util';

export type ScrollAreaStyleProps = {
  orientation?: AllowedAxis;
  autoHide?: boolean;
  /** Balance left/right, top/bottom "margin" with scrollbar. */
  margin?: boolean;
  /** Add default padding. */
  /** TODO(burdon): Integrate with Column.Root padding. */
  padding?: boolean;
  /** Use thin scrollbars. */
  /** TODO(burdon): Density fine/course. */
  thin?: boolean;
  /** Enable snap scrolling. */
  snap?: boolean;
};

export const scrollAreaRoot: ComponentFunction<ScrollAreaStyleProps> = ({ orientation, margin, thin }, ...etc) =>
  mx(
    // Expand
    'dx-container',

    orientation === 'vertical' && 'group/scroll-v flex flex-col',
    orientation === 'horizontal' && 'group/scroll-h flex',
    orientation === 'all' && 'group/scroll-all',

    // Apply col-span-full only when inside a Column.Root grid (detected via dx-column marker).
    '[.dx-column_&]:col-span-full',

    ...etc,
  );

/**
 * NOTE: The browser reserves space for scrollbars.
 */
export const scrollAreaViewport: ComponentFunction<ScrollAreaStyleProps> = (
  { orientation, margin, padding, snap, thin, autoHide },
  ...etc
) =>
  mx(
    'h-full w-full',

    orientation === 'vertical' && 'flex flex-col overflow-y-scroll',
    orientation === 'horizontal' && 'flex overflow-x-scroll',
    orientation === 'all' && 'overflow-scroll',

    '[&::-webkit-scrollbar-corner]:bg-transparent',
    '[&::-webkit-scrollbar-track]:bg-transparent',
    '[&::-webkit-scrollbar-thumb]:rounded-none',

    thin
      ? '[&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar]:h-[4px]'
      : '[&::-webkit-scrollbar]:w-[8px] [&::-webkit-scrollbar]:h-[8px]',

    // NOTE: Uses --gutter CSS variable
    // If contained within Column.Root grid the gutter is set by that component.
    // TODO(burdon): Increase padding.

    (orientation === 'vertical' || orientation === 'all') &&
      (padding
        ? thin
          ? 'pl-[var(--gutter,4px)] pr-[calc(var(--gutter,4px)-4px)]'
          : 'pl-[var(--gutter,8px)] pr-[calc(var(--gutter,8px)-8px)]'
        : margin && (thin ? 'pl-[4px]' : 'pl-[8px]')),

    (orientation === 'horizontal' || orientation === 'all') &&
      (padding
        ? thin
          ? 'pt-[var(--gutter,4px)] pb-[calc(var(--gutter,4px)-4px)]'
          : 'pt-[var(--gutter,8px)] pb-[calc(var(--gutter,8px)-8px)]'
        : margin && (thin ? 'pt-[4px]' : 'pt-[8px]')),

    snap && [
      orientation === 'vertical' && 'snap-y snap-mandatory',
      orientation === 'horizontal' && 'snap-x snap-mandatory',
      orientation === 'all' && 'snap-both snap-mandatory',
    ],

    autoHide
      ? [
          orientation === 'vertical' && 'group-hover/scroll-v:[&::-webkit-scrollbar-thumb]:bg-scrollbar-thumb',
          orientation === 'horizontal' && 'group-hover/scroll-h:[&::-webkit-scrollbar-thumb]:bg-scrollbar-thumb',
          orientation === 'all' && 'group-hover/scroll-all:[&::-webkit-scrollbar-thumb]:bg-scrollbar-thumb',
        ]
      : [
          orientation === 'vertical' && '[&::-webkit-scrollbar-thumb]:bg-scrollbar-thumb',
          orientation === 'horizontal' && '[&::-webkit-scrollbar-thumb]:bg-scrollbar-thumb',
          orientation === 'all' && '[&::-webkit-scrollbar-thumb]:bg-scrollbar-thumb',
        ],

    ...etc,
  );

export const scrollAreaTheme: Theme<ScrollAreaStyleProps> = {
  root: scrollAreaRoot,
  viewport: scrollAreaViewport,
};

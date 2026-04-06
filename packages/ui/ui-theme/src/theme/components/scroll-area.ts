//
// Copyright 2026 DXOS.org
//

import { type AllowedAxis, type ComponentFunction, type Theme } from '@dxos/ui-types';

import { mx } from '../../util';

export const scrollbar = {
  thin: {
    size: 4,
    padding: 4,
  },
  coarse: {
    size: 8,
    padding: 8,
  },
};

export type ScrollAreaStyleProps = {
  orientation?: AllowedAxis;
  autoHide?: boolean;
  /** Balance left/right, top/bottom offset with scrollbar. */
  centered?: boolean;
  /** Add default padding. */
  /** TODO(burdon): Integrate with Column.Root padding. */
  padding?: boolean;
  /** Use thin scrollbars. */
  /** TODO(burdon): Density fine/course. */
  thin?: boolean;
  /** Enable snap scrolling. */
  snap?: boolean;
};

export const scrollAreaRoot: ComponentFunction<ScrollAreaStyleProps> = ({ orientation }, ...etc) =>
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
  { orientation, centered, padding, snap, thin, autoHide },
  ...etc
) => {
  return mx(
    'h-full w-full',

    orientation === 'vertical' && 'flex flex-col overflow-y-scroll',
    orientation === 'horizontal' && 'flex overflow-x-scroll overscroll-x-contain',
    orientation === 'all' && 'overflow-scroll',

    '[&::-webkit-scrollbar-corner]:bg-transparent',
    '[&::-webkit-scrollbar-track]:bg-transparent',
    '[&::-webkit-scrollbar-thumb]:rounded-none',

    '[&::-webkit-scrollbar]:w-[var(--scroll-width)] [&::-webkit-scrollbar]:h-[var(--scroll-width)]',

    // If contained within Column.Root grid the gutter is set by that component (--gutter CSS variable).
    // If centered, left padding compensates for scrollbar width so content is visually centered.
    (orientation === 'vertical' || orientation === 'all') &&
      (padding
        ? [
            centered ? 'pl-[var(--gutter,calc(var(--scroll-width)+var(--scroll-padding)))]' : 'pl-[var(--gutter,0)]',
            'pr-[calc(var(--gutter,calc(var(--scroll-width)+var(--scroll-padding)))-var(--scroll-width))]',
          ]
        : centered && 'pl-[var(--scroll-width)]'),

    (orientation === 'horizontal' || orientation === 'all') &&
      (padding
        ? [centered && 'pt-[calc(var(--scroll-width)+var(--scroll-padding))]', 'pb-[var(--scroll-padding)]']
        : centered && 'pt-[var(--scroll-width)]'),

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
};

export const scrollAreaTheme: Theme<ScrollAreaStyleProps> = {
  root: scrollAreaRoot,
  viewport: scrollAreaViewport,
};

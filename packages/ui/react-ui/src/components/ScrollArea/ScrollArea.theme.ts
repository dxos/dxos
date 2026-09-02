//
// Copyright 2026 DXOS.org
//

import { mx } from '@dxos/ui-theme';
import { type AllowedAxis, type ComponentFunction, type Theme } from '@dxos/ui-types';

import { withColumn } from '../Column';

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
  /** Use the native scrollbar, which reserves layout width, instead of an overlay thumb. */
  native?: boolean;
  /** Show a scrollbar at all. */
  scrollbars?: boolean;
};

const root: ComponentFunction<ScrollAreaStyleProps> = ({ orientation, native }, ...etc) =>
  mx(
    // Expand. `dx-scroll-boundary` marks this as a scroll root for `withColumn.propagate()`,
    // which exempts it from the centre track so the scrollbar stays in the gutter.
    'dx-expand overflow-hidden dx-scroll-boundary',

    // Positioning context for the absolutely positioned overlay thumbs.
    !native && 'relative',

    orientation === 'vertical' && 'group/scroll-v flex flex-col',
    orientation === 'horizontal' && 'group/scroll-h flex',
    // `flex flex-col` is required (as in `vertical`) so the viewport's `dx-grow` can
    // bound its height; without it the viewport grows to content height and only scrolls
    // horizontally (the root clips the vertical overflow instead of scrolling it).
    orientation === 'all' && 'group/scroll-all flex flex-col',

    // Apply col-span-full only when inside a Column.Root grid (detected via dx-column-root marker).
    '[.dx-column-root_&]:col-span-full',

    ...etc,
  );

/**
 * NOTE: The browser reserves space for scrollbars.
 */
const viewport: ComponentFunction<ScrollAreaStyleProps> = (
  { orientation, centered, padding, snap, autoHide, native, scrollbars = true },
  ...etc
) => {
  return mx(
    'dx-grow w-full',

    // Reset --dx-col so nested components don't try to grid-position themselves.
    // ScrollArea has already consumed --gutter for padding.
    withColumn.consumed(),

    orientation === 'vertical' && 'overflow-y-scroll',
    orientation === 'horizontal' && 'flex overflow-x-scroll overscroll-x-contain',
    orientation === 'all' && 'overflow-scroll',

    // A styled `::-webkit-scrollbar` is always a classic scrollbar and so consumes layout width;
    // overlay mode removes it entirely and paints the thumb over the content instead. Zeroing
    // `--scroll-width` is not enough to suppress it: Firefox needs `scrollbar-width` explicitly.
    !native || !scrollbars
      ? ['[scrollbar-width:none]', '[&::-webkit-scrollbar]:hidden']
      : [
          '[&::-webkit-scrollbar-corner]:bg-transparent',
          '[&::-webkit-scrollbar-track]:bg-transparent',
          '[&::-webkit-scrollbar-thumb]:rounded-none',
          '[&::-webkit-scrollbar]:w-[var(--scroll-width)] [&::-webkit-scrollbar]:h-[var(--scroll-width)]',
        ],

    // If contained within Column.Root grid the gutter is set by that component (--gutter CSS variable).
    // If centered, the opposite side is padded to match so content is visually centered.
    // The overlay thumb sits outside the flow, so `padding` must reserve the whole strip it occupies
    // (its thickness plus its inset at both ends); the native bar already consumes its own width, so
    // that branch subtracts it back out.
    (orientation === 'vertical' || orientation === 'all') &&
      (padding
        ? !native
          ? [
              centered ? 'pl-[var(--gutter,var(--scroll-strip))]' : 'pl-[var(--gutter,0)]',
              'pr-[var(--gutter,var(--scroll-strip))]',
            ]
          : [
              centered ? 'pl-[var(--gutter,calc(var(--scroll-width)+var(--scroll-padding)))]' : 'pl-[var(--gutter,0)]',
              'pr-[calc(var(--gutter,calc(var(--scroll-width)+var(--scroll-padding)))-var(--scroll-width))]',
            ]
        : native && centered && 'pl-[var(--scroll-width)]'),

    (orientation === 'horizontal' || orientation === 'all') &&
      (padding
        ? !native
          ? [centered && 'pt-[var(--gutter,var(--scroll-strip))]', 'pb-[var(--gutter,var(--scroll-strip))]']
          : [centered && 'pt-[calc(var(--scroll-width)+var(--scroll-padding))]', 'pb-[var(--scroll-padding)]']
        : native && centered && 'pt-[var(--scroll-width)]'),

    snap && [
      orientation === 'vertical' && 'snap-y snap-mandatory',
      orientation === 'horizontal' && 'snap-x snap-mandatory',
      orientation === 'all' && 'snap-both snap-mandatory',
    ],

    native &&
      (autoHide
        ? [
            orientation === 'vertical' && 'group-hover/scroll-v:[&::-webkit-scrollbar-thumb]:bg-scrollbar-thumb',
            orientation === 'horizontal' && 'group-hover/scroll-h:[&::-webkit-scrollbar-thumb]:bg-scrollbar-thumb',
            orientation === 'all' && 'group-hover/scroll-all:[&::-webkit-scrollbar-thumb]:bg-scrollbar-thumb',
          ]
        : ['[&::-webkit-scrollbar-thumb]:bg-scrollbar-thumb']),

    ...etc,
  );
};

export const scrollAreaTheme: Theme<ScrollAreaStyleProps> = {
  root,
  viewport,
};

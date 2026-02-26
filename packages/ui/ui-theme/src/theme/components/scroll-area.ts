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
  padding?: boolean;
  /** Use thin scrollbars. */
  thin?: boolean;
  /** Enable snap scrolling. */
  snap?: boolean;
};

export const scrollAreaRoot: ComponentFunction<ScrollAreaStyleProps> = ({ orientation, margin, thin }, ...etc) =>
  mx(
    'overflow-hidden',

    // NOTE: min-h-0 is required for vertical scrollbars
    orientation === 'vertical' && 'group/scroll-v w-full min-h-0 h-full',
    orientation === 'horizontal' && 'group/scroll-h w-full min-w-0 h-full',
    orientation === 'all' && 'group/scroll-all h-full min-h-0 w-full min-w-0',

    margin && [
      orientation === 'vertical' && (thin ? 'pl-[4px]' : 'pl-[8px]'),
      orientation === 'horizontal' && (thin ? 'py-[4px]' : 'py-[8px]'),
      orientation === 'all' && (thin ? 'pl-[4px] py-[8px]' : 'pl-[8px] py-[8px]'),
    ],

    ...etc,
  );

/**
 * NOTE: The browser reserves space for scrollbars.
 */
export const scrollAreaViewport: ComponentFunction<ScrollAreaStyleProps> = (
  { orientation, autoHide, padding, snap, thin },
  ...etc
) =>
  mx(
    'h-full w-full',

    orientation === 'vertical' && 'flex flex-col overflow-y-scroll',
    orientation === 'horizontal' && 'flex overflow-x-scroll',
    orientation === 'all' && 'overflow-scroll',

    thin
      ? '[&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar]:h-[4px]'
      : '[&::-webkit-scrollbar]:w-[8px] [&::-webkit-scrollbar]:h-[8px]',

    '[&::-webkit-scrollbar-corner]:bg-transparent',
    '[&::-webkit-scrollbar-track]:bg-transparent',
    '[&::-webkit-scrollbar-thumb]:rounded-none',

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

    padding && [
      orientation === 'vertical' && 'px-[4px]',
      orientation === 'horizontal' && 'pb-[4px]',
      orientation === 'all' && 'pl-[4px] pb-[4px]',
    ],

    snap && [
      orientation === 'vertical' && 'snap-y snap-mandatory',
      orientation === 'horizontal' && 'snap-x snap-mandatory',
      orientation === 'all' && 'snap-both snap-mandatory',
    ],

    ...etc,
  );

export const scrollAreaTheme: Theme<ScrollAreaStyleProps> = {
  root: scrollAreaRoot,
  viewport: scrollAreaViewport,
};

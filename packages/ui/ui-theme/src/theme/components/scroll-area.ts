//
// Copyright 2026 DXOS.org
//

import { type AllowedAxis, type ComponentFunction, type Theme } from '@dxos/ui-types';

import { mx } from '../../util';

export type ScrollAreaStyleProps = {
  orientation?: AllowedAxis;
  autoHide?: boolean;
  margin?: boolean;
  padding?: boolean;
  thin?: boolean;
  snap?: boolean;
};

export const scrollAreaRoot: ComponentFunction<ScrollAreaStyleProps> = ({ orientation, margin, thin }, ...etc) =>
  mx(
    'overflow-hidden',

    orientation === 'vertical' && 'group/scroll-v block-full inline-full min-block-0',
    orientation === 'horizontal' && 'group/scroll-h block-full inline-full min-inline-0',
    orientation === 'all' && 'group/scroll-all block-full inline-full min-block-0 min-inline-0',

    // Balance left/right, top/bottom "margin" with scrollbar.
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
    'block-full inline-full',

    orientation === 'vertical' && 'flex flex-col overflow-y-scroll',
    orientation === 'horizontal' && 'flex overflow-x-scroll',
    orientation === 'all' && 'overflow-scroll',

    thin
      ? '[&::-webkit-scrollbar]:inline-[4px] [&::-webkit-scrollbar]:block-[4px]'
      : '[&::-webkit-scrollbar]:inline-[8px] [&::-webkit-scrollbar]:block-[8px]',

    '[&::-webkit-scrollbar-corner]:bg-transparent',
    '[&::-webkit-scrollbar-track]:bg-transparent',
    '[&::-webkit-scrollbar-thumb]:rounded-none',

    autoHide
      ? [
          orientation === 'vertical' && 'group-hover/scroll-v:[&::-webkit-scrollbar-thumb]:bg-scrollbarThumb',
          orientation === 'horizontal' && 'group-hover/scroll-h:[&::-webkit-scrollbar-thumb]:bg-scrollbarThumb',
          orientation === 'all' && 'group-hover/scroll-all:[&::-webkit-scrollbar-thumb]:bg-scrollbarThumb',
        ]
      : [
          orientation === 'vertical' && '[&::-webkit-scrollbar-thumb]:bg-scrollbarThumb',
          orientation === 'horizontal' && '[&::-webkit-scrollbar-thumb]:bg-scrollbarThumb',
          orientation === 'all' && '[&::-webkit-scrollbar-thumb]:bg-scrollbarThumb',
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

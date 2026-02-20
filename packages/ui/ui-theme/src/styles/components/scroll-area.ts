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

    orientation === 'vertical' && 'group/scroll-v bs-full is-full min-bs-0',
    orientation === 'horizontal' && 'group/scroll-h bs-full is-full min-is-0',
    orientation === 'all' && 'group/scroll-all bs-full is-full min-bs-0 min-is-0',

    // Balance left/right, top/bottom "margin" with scrollbar.
    margin && [
      orientation === 'vertical' && (thin ? 'pis-[4px]' : 'pis-[8px]'),
      orientation === 'horizontal' && (thin ? 'pbs-[4px]' : 'pbs-[8px]'),
      orientation === 'all' && (thin ? 'pis-[4px] pbs-[8px]' : 'pis-[8px] pbs-[8px]'),
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
    'bs-full is-full',

    orientation === 'vertical' && 'flex flex-col overflow-y-scroll',
    orientation === 'horizontal' && 'flex overflow-x-scroll',
    orientation === 'all' && 'overflow-scroll',

    thin
      ? '[&::-webkit-scrollbar]:is-[4px] [&::-webkit-scrollbar]:bs-[4px]'
      : '[&::-webkit-scrollbar]:is-[8px] [&::-webkit-scrollbar]:bs-[8px]',

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
      orientation === 'vertical' && 'pli-[4px]',
      orientation === 'horizontal' && 'pbe-[4px]',
      orientation === 'all' && 'pis-[4px] pbe-[4px]',
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

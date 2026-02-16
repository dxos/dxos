//
// Copyright 2026 DXOS.org
//

import { type AllowedAxis, type ComponentFunction, type Theme } from '@dxos/ui-types';

import { mx } from '../../util';

export type ScrollAreaStyleProps = {
  orientation?: AllowedAxis;
  padding?: boolean;
  thin?: boolean;
  snap?: boolean;
};

export const scrollAreaRoot: ComponentFunction<ScrollAreaStyleProps> = ({ orientation }, ...etc) =>
  mx(
    'overflow-hidden',
    orientation === 'vertical' && 'group/scroll-v bs-full is-full min-bs-0',
    orientation === 'horizontal' && 'group/scroll-h bs-full is-full min-is-0',
    orientation === 'all' && 'group/scroll-all bs-full is-full min-bs-0 min-is-0',
    ...etc,
  );

/**
 * NOTE: The browser reserves space for scrollbars.
 */
export const scrollAreaViewport: ComponentFunction<ScrollAreaStyleProps> = (
  { orientation, padding, snap, thin },
  ...etc
) =>
  mx(
    'bs-full is-full',
    orientation === 'vertical' && 'flex flex-col overflow-y-scroll',
    orientation === 'horizontal' && 'flex overflow-x-scroll',
    orientation === 'all' && 'overflow-scroll',

    // Scrollbar styling.
    thin
      ? '[&::-webkit-scrollbar]:is-[3px] [&::-webkit-scrollbar]:bs-[3px]'
      : '[&::-webkit-scrollbar]:is-[6px] [&::-webkit-scrollbar]:bs-[6px]',

    '[&::-webkit-scrollbar-thumb]:bg-transparent',
    '[&::-webkit-scrollbar-corner]:bg-transparent',

    // '[&::-webkit-scrollbar-thumb]:rounded-full',

    orientation === 'vertical' && 'group-hover/scroll-v:[&::-webkit-scrollbar-thumb]:bg-neutral-300',
    orientation === 'vertical' && 'dark:group-hover/scroll-v:[&::-webkit-scrollbar-thumb]:bg-neutral-600',
    orientation === 'horizontal' && 'group-hover/scroll-h:[&::-webkit-scrollbar-thumb]:bg-neutral-300',
    orientation === 'horizontal' && 'dark:group-hover/scroll-h:[&::-webkit-scrollbar-thumb]:bg-neutral-600',
    orientation === 'all' && 'group-hover/scroll-all:[&::-webkit-scrollbar-thumb]:bg-neutral-300',
    orientation === 'all' && 'dark:group-hover/scroll-all:[&::-webkit-scrollbar-thumb]:bg-neutral-600',

    // TODO(burdon): FIX.
    padding && [
      orientation === 'vertical' && 'pie-2',
      orientation === 'horizontal' && 'pbe-2',
      orientation === 'all' && 'pie-2 pbe-2',
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

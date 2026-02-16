//
// Copyright 2026 DXOS.org
//

import { type AllowedAxis, type ComponentFunction, type Theme } from '@dxos/ui-types';

import { mx } from '../../util';

export type ScrollAreaStyleProps = {
  orientation?: AllowedAxis;
  autoHide?: boolean;
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
  { orientation, autoHide, padding, snap, thin },
  ...etc
) =>
  mx(
    'bs-full is-full',
    orientation === 'vertical' && 'flex flex-col overflow-y-scroll',
    orientation === 'horizontal' && 'flex overflow-x-scroll',
    orientation === 'all' && 'overflow-scroll',

    thin
      ? '[&::-webkit-scrollbar]:is-[3px] [&::-webkit-scrollbar]:bs-[3px]'
      : '[&::-webkit-scrollbar]:is-[6px] [&::-webkit-scrollbar]:bs-[6px]',

    // '[&::-webkit-scrollbar-thumb]:rounded-full',
    '[&::-webkit-scrollbar-thumb]:bg-transparent',
    '[&::-webkit-scrollbar-corner]:bg-transparent',

    // TODO(burdon): Define token.
    'hover:[&::-webkit-scrollbar-thumb]:bg-separator',
    autoHide
      ? [
          orientation === 'vertical' && 'group-hover/scroll-v:[&::-webkit-scrollbar-thumb]:bg-subduedSeparator',
          orientation === 'horizontal' && 'group-hover/scroll-h:[&::-webkit-scrollbar-thumb]:bg-subduedSeparator',
          orientation === 'all' && 'group-hover/scroll-all:[&::-webkit-scrollbar-thumb]:bg-subduedSeparator',
        ]
      : [
          orientation === 'vertical' && '[&::-webkit-scrollbar-thumb]:bg-subduedSeparator',
          orientation === 'horizontal' && '[&::-webkit-scrollbar-thumb]:bg-subduedSeparator',
          orientation === 'all' && '[&::-webkit-scrollbar-thumb]:bg-subduedSeparator',
        ],

    padding && [
      orientation === 'vertical' && 'pli-2',
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

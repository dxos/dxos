//
// Copyright 2023 DXOS.org
//

import { type ComponentFunction, type Theme } from '@dxos/react-ui-types';

import { mx } from '../../util';

export type ScrollAreaStyleProps = {};

export const scrollAreaRoot: ComponentFunction<ScrollAreaStyleProps> = (_props, ...etc) =>
  mx('overflow-hidden', ...etc);

export const scrollAreaViewport: ComponentFunction<ScrollAreaStyleProps> = (_props, ...etc) =>
  mx('is-full bs-full [&>div]:table-fixed [&>div]:is-full', ...etc);

export const scrollAreaScrollbar: ComponentFunction<ScrollAreaStyleProps> = (_props, ...etc) =>
  mx(
    'flex select-none touch-none p-0.5 ease-out',
    'data-[orientation=vertical]:is-1.5 sm:data-[orientation=vertical]:data-[variant=coarse]:is-3',
    'data-[orientation=horizontal]:flex-col data-[orientation=horizontal]:bs-1.5 sm:data-[orientation=horizontal]:data-[variant=coarse]:bs-3',
    'sm:data-[variant=coarse]:bg-separator rounded-full',
    '[&>div]:bg-unAccent sm:[&[data-variant=coarse]>div]:bg-attention',
    ...etc,
  );

export const scrollAreaThumb: ComponentFunction<ScrollAreaStyleProps> = (_props, ...etc) =>
  mx(
    'flex-1 rounded-full relative',
    "before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:is-full before:bs-full before:min-w-[6px] before:min-h-[6px]",
    ...etc,
  );

export const scrollAreaCorner: ComponentFunction<ScrollAreaStyleProps> = (_props, ...etc) => mx(...etc);

export const scrollAreaTheme: Theme<ScrollAreaStyleProps> = {
  root: scrollAreaRoot,
  viewport: scrollAreaViewport,
  scrollbar: scrollAreaScrollbar,
  thumb: scrollAreaThumb,
  corner: scrollAreaCorner,
};

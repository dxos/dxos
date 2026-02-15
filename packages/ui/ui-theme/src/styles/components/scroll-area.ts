//
// Copyright 2026 DXOS.org
//

import { type Axis, type ComponentFunction, type Theme } from '@dxos/ui-types';

import { mx } from '../../util';

export type ScrollAreaStyleProps = {
  orientation?: Axis;
  thin?: boolean;
};

export const scrollAreaRoot: ComponentFunction<ScrollAreaStyleProps> = (_props, ...etc) =>
  mx('bs-full is-full relative overflow-hidden', ...etc);

export const scrollAreaViewport: ComponentFunction<ScrollAreaStyleProps> = (_props, ...etc) =>
  mx('bs-full is-full rounded-[inherit]', ...etc);

export const scrollAreaScrollbar: ComponentFunction<ScrollAreaStyleProps> = (
  { orientation = 'vertical', thin },
  ...etc
) =>
  mx(
    'flex touch-none select-none transition-colors',
    orientation === 'vertical' && !thin && 'bs-full is-2.5 border-l border-l-transparent p-[1px]',
    orientation === 'vertical' && thin && 'bs-full is-1.5 border-l border-l-transparent p-[1px]',
    orientation === 'horizontal' && !thin && 'is-full bs-2.5 flex-col border-t border-t-transparent p-[1px]',
    orientation === 'horizontal' && thin && 'is-full bs-1.5 flex-col border-t border-t-transparent p-[1px]',
    ...etc,
  );

export const scrollAreaThumb: ComponentFunction<ScrollAreaStyleProps> = ({ thin }, ...etc) =>
  mx('relative flex-1 rounded-full bg-neutral-300 dark:bg-neutral-600', thin && 'min-w-[4px] min-h-[4px]', ...etc);

export const scrollAreaCorner: ComponentFunction<ScrollAreaStyleProps> = (_props, ...etc) => mx(...etc);

export const scrollAreaTheme: Theme<ScrollAreaStyleProps> = {
  root: scrollAreaRoot,
  viewport: scrollAreaViewport,
  scrollbar: scrollAreaScrollbar,
  thumb: scrollAreaThumb,
  corner: scrollAreaCorner,
};

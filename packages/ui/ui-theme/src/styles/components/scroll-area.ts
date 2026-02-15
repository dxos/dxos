//
// Copyright 2026 DXOS.org
//

import { type AllowedAxis, type ComponentFunction, type Theme } from '@dxos/ui-types';

import { mx } from '../../util';

export type ScrollAreaStyleProps = {
  native?: boolean;
  orientation?: AllowedAxis;
  padding?: boolean;
  thin?: boolean;
  snap?: boolean;
};

export const scrollAreaRoot: ComponentFunction<ScrollAreaStyleProps> = ({ orientation }, ...etc) =>
  mx(
    'relative overflow-hidden',
    orientation === 'vertical' && 'bs-full is-full min-bs-0',
    orientation === 'horizontal' && 'bs-full is-full min-is-0',
    orientation === 'all' && 'bs-full is-full min-bs-0 min-is-0',
    ...etc,
  );

export const scrollAreaViewport: ComponentFunction<ScrollAreaStyleProps> = (
  { native, orientation, padding, snap },
  ...etc
) =>
  mx(
    'bs-full is-full rounded-[inherit]',
    padding && [
      orientation === 'vertical' && 'pli-3',
      orientation === 'horizontal' && 'pbe-3',
      orientation === 'all' && 'pli-3 pbe-3',
    ],
    snap && [
      orientation === 'vertical' && 'snap-y snap-mandatory',
      orientation === 'horizontal' && 'snap-x snap-mandatory',
      orientation === 'all' && 'snap-both snap-mandatory',
    ],
    !native && [
      orientation === 'vertical' && '[&>*]:!block [&>*]:is-full',
      orientation === 'horizontal' && '[&>*]:!block [&>*]:bs-full',
      orientation === 'all' && '[&>*]:!block',
    ],
    ...etc,
  );

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

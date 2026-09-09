//
// Copyright 2026 DXOS.org
//

import { mx } from '@dxos/ui-theme';
import { type ComponentFunction, type Theme } from '@dxos/ui-types';

export type TocStyleProps = {};

const root: ComponentFunction<TocStyleProps> = (_props, ...etc) => mx('relative', ...etc);

const content: ComponentFunction<TocStyleProps> = (_props, ...etc) => mx(...etc);

const nav: ComponentFunction<TocStyleProps> = (_props, ...etc) => mx('flex flex-col gap-1 text-sm', ...etc);

const title: ComponentFunction<TocStyleProps> = (_props, ...etc) =>
  mx('px-2 pb-1 text-xs font-medium uppercase text-description', ...etc);

// Positioned: the machine measures the indicator's offset against the list.
const list: ComponentFunction<TocStyleProps> = (_props, ...etc) => mx('relative flex flex-col', ...etc);

// The machine writes `--top`/`--height` on the root and positions the indicator absolutely.
const indicator: ComponentFunction<TocStyleProps> = (_props, ...etc) =>
  mx(
    'left-0 w-0.5 rounded-full bg-accent-bg top-(--top) h-(--height)',
    'transition-[top,height] duration-150 ease-out',
    ...etc,
  );

// One step per heading level below the first (`h2` is the first step in).
const item: ComponentFunction<TocStyleProps> = (_props, ...etc) => mx('ps-[calc((var(--depth)-1)*0.75rem)]', ...etc);

const link: ComponentFunction<TocStyleProps> = (_props, ...etc) =>
  mx(
    'block rounded-sm px-2 py-0.5 truncate text-description hover:text-base-fg data-[active]:text-accent-text dx-focus-ring',
    ...etc,
  );

export const tocTheme: Theme<TocStyleProps> = {
  root,
  content,
  nav,
  title,
  list,
  indicator,
  item,
  link,
};

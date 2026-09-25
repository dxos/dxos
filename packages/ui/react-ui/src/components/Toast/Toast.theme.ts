//
// Copyright 2023 DXOS.org
//

import { mx, surfaceShadow } from '@dxos/ui-theme';
import { type ComponentFunction, type Theme } from '@dxos/ui-types';

export type ToastStyleProps = {};

// The machine positions the region and each toast inline (`toast.css` transitions what it drives);
// the theme sizes and paints.
const viewport: ComponentFunction<ToastStyleProps> = (_props, ...etc) => mx(...etc);

const root: ComponentFunction<ToastStyleProps> = (_props, ...etc) =>
  mx(
    'dx-popover-surface rounded-md p-1 w-[calc(100dvw-2rem)] md:w-96',
    surfaceShadow({ elevation: 'toast' }),
    'dx-focus-ring',
    ...etc,
  );

const grid: ComponentFunction<ToastStyleProps> = (_props, ...etc) => mx('gap-y-1 pb-1', ...etc);

const header: ComponentFunction<ToastStyleProps> = (_props, ...etc) => mx('items-center', ...etc);

const title: ComponentFunction<ToastStyleProps> = (_props, ...etc) => mx('col-start-2 truncate font-medium', ...etc);

const description: ComponentFunction<ToastStyleProps> = (_props, ...etc) =>
  mx('col-start-2 overflow-hidden text-description', ...etc);

const actions: ComponentFunction<ToastStyleProps> = (_props, ...etc) => mx('flex gap-2 mt-1', ...etc);

const countdown: ComponentFunction<ToastStyleProps> = (_props, ...etc) => mx('mx-1', ...etc);

export const toastTheme: Theme<ToastStyleProps> = {
  viewport,
  root,
  grid,
  header,
  title,
  description,
  actions,
  countdown,
};

//
// Copyright 2023 DXOS.org
//

import { mx, surfaceShadow } from '@dxos/ui-theme';
import { type ComponentFunction, type Theme } from '@dxos/ui-types';

export type ToastStyleProps = {};

const viewport: ComponentFunction<ToastStyleProps> = (_props, ...etc) =>
  mx(
    // TODO(burdon): block-end should take into account status bar.
    'z-40 fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] inset-start-[calc(env(safe-area-inset-left)+1rem)] inset-end-[calc(env(safe-area-inset-right)+1rem)] w-auto md:end-[calc(env(safe-area-inset-right)+1rem)] md:left-auto md:w-full md:max-w-sm',
    'rounded-md flex flex-col gap-2',
    ...etc,
  );

const root: ComponentFunction<ToastStyleProps> = (_props, ...etc) =>
  mx(
    'dx-modal-surface rounded-md p-1',
    surfaceShadow({ elevation: 'toast' }),
    'radix-state-open:animate-toast-slide-in-bottom md:radix-state-open:animate-toast-slide-in-right',
    'radix-state-closed:animate-toast-hide',
    'radix-swipe-end:animate-toast-swipe-out',
    'translate-x-radix-toast-swipe-move-x',
    'radix-swipe-cancel:translate-x-0 radix-swipe-cancel:duration-200 radix-swipe-cancel:ease-[ease]',
    'dx-focus-ring',
    ...etc,
  );

const grid: ComponentFunction<ToastStyleProps> = (_props, ...etc) => mx('gap-y-1', ...etc);

const header: ComponentFunction<ToastStyleProps> = (_props, ...etc) => mx('items-center', ...etc);

const icon: ComponentFunction<ToastStyleProps> = (_props, ...etc) => mx('col-start-1 grid place-items-center', ...etc);

const title: ComponentFunction<ToastStyleProps> = (_props, ...etc) =>
  mx('col-start-2 overflow-hidden truncate font-medium', ...etc);

const close: ComponentFunction<ToastStyleProps> = (_props, ...etc) => mx('col-start-3', ...etc);

const description: ComponentFunction<ToastStyleProps> = (_props, ...etc) => mx('col-start-2 text-description', ...etc);

const actions: ComponentFunction<ToastStyleProps> = (_props, ...etc) => mx('flex gap-2 mbs-1 pbe-2', ...etc);

export const toastTheme: Theme<ToastStyleProps> = {
  viewport,
  root,
  grid,
  header,
  icon,
  title,
  close,
  description,
  actions,
};

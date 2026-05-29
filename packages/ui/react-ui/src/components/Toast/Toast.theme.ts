//
// Copyright 2023 DXOS.org
//

import { mx, surfaceShadow } from '@dxos/ui-theme';
import { type ComponentFunction, type Theme } from '@dxos/ui-types';

export type ToastStyleProps = Partial<{
  srOnly: boolean;
}>;

const viewport: ComponentFunction<ToastStyleProps> = (_props, ...etc) =>
  mx(
    // TODO(burdon): block-end should take into account status bar.
    'z-40 fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] inset-start-[calc(env(safe-area-inset-left)+1rem)] inset-end-[calc(env(safe-area-inset-right)+1rem)] w-auto md:end-[calc(env(safe-area-inset-right)+1rem)] md:left-auto md:w-full md:max-w-sm',
    'rounded-md flex flex-col gap-2',
    ...etc,
  );

const root: ComponentFunction<ToastStyleProps> = (_props, ...etc) =>
  mx(
    'dx-modal-surface rounded-md flex p-2 gap-2',
    surfaceShadow({ elevation: 'toast' }),
    'radix-state-open:animate-toast-slide-in-bottom md:radix-state-open:animate-toast-slide-in-right',
    'radix-state-closed:animate-toast-hide',
    'radix-swipe-end:animate-toast-swipe-out',
    'translate-x-radix-toast-swipe-move-x',
    'radix-swipe-cancel:translate-x-0 radix-swipe-cancel:duration-200 radix-swipe-cancel:ease-[ease]',
    'dx-focus-ring',
    ...etc,
  );

const body: ComponentFunction<ToastStyleProps> = (_props, ...etc) =>
  mx('grow flex flex-col gap-1 justify-center pl-2', ...etc);

const actions: ComponentFunction<ToastStyleProps> = (_props, ...etc) =>
  mx('shrink-0 flex flex-col gap-1 justify-center', ...etc);

const title: ComponentFunction<ToastStyleProps> = ({ srOnly }, ...etc) =>
  mx('shrink-0 font-medium', srOnly && 'sr-only', ...etc);

const description: ComponentFunction<ToastStyleProps> = ({ srOnly }, ...etc) =>
  mx('text-description', 'shrink-0', srOnly && 'sr-only', ...etc);

export const toastTheme: Theme<ToastStyleProps> = {
  viewport,
  root,
  body,
  title,
  description,
  actions,
};

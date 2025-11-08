//
// Copyright 2023 DXOS.org
//

import { type ComponentFunction, type Theme } from '@dxos/react-ui-types';

import { mx } from '../../util';
import { descriptionText, focusRing, modalSurface, surfaceShadow } from '../fragments';

export type ToastStyleProps = Partial<{
  srOnly: boolean;
}>;

export const toastViewport: ComponentFunction<ToastStyleProps> = (_props, ...etc) =>
  mx(
    // TODO(burdon): block-end should take into account status bar.
    'z-40 fixed block-end-[calc(env(safe-area-inset-bottom)+1rem)] inset-start-[calc(env(safe-area-inset-left)+1rem)] inset-end-[calc(env(safe-area-inset-right)+1rem)] w-auto md:inline-end-[calc(env(safe-area-inset-right)+1rem)] md:inline-start-auto md:is-full md:max-is-sm',
    'rounded-md flex flex-col gap-2',
    ...etc,
  );

export const toastRoot: ComponentFunction<ToastStyleProps> = (_props, ...etc) =>
  mx(
    'rounded-md flex p-2 gap-2',
    modalSurface,
    surfaceShadow({ elevation: 'toast' }),
    'radix-state-open:animate-toast-slide-in-bottom md:radix-state-open:animate-toast-slide-in-right',
    'radix-state-closed:animate-toast-hide',
    'radix-swipe-end:animate-toast-swipe-out',
    'translate-x-radix-toast-swipe-move-x',
    'radix-swipe-cancel:translate-x-0 radix-swipe-cancel:duration-200 radix-swipe-cancel:ease-[ease]',
    focusRing,
    ...etc,
  );

export const toastBody: ComponentFunction<ToastStyleProps> = (_props, ...etc) =>
  mx('grow flex flex-col gap-1 justify-center pis-2', ...etc);

export const toastActions: ComponentFunction<ToastStyleProps> = (_props, ...etc) =>
  mx('shrink-0 flex flex-col gap-1 justify-center', ...etc);

export const toastTitle: ComponentFunction<ToastStyleProps> = ({ srOnly }, ...etc) =>
  mx('shrink-0 font-medium', srOnly && 'sr-only', ...etc);

export const toastDescription: ComponentFunction<ToastStyleProps> = ({ srOnly }, ...etc) =>
  mx(descriptionText, 'shrink-0', srOnly && 'sr-only', ...etc);

export const toastTheme: Theme<ToastStyleProps> = {
  viewport: toastViewport,
  root: toastRoot,
  body: toastBody,
  title: toastTitle,
  description: toastDescription,
  actions: toastActions,
};

//
// Copyright 2023 DXOS.org
//

import { type ComponentFunction, type Theme } from '@dxos/aurora-types';

import { mx } from '../../util';
import { descriptionText, focusRing, chromeSurface, surfaceElevation } from '../fragments';

export type ToastStyleProps = Partial<{
  srOnly: boolean;
}>;

export const toastViewport: ComponentFunction<ToastStyleProps> = (_props, ...etc) =>
  mx(
    'z-[70] fixed bottom-4 inset-x-4 w-auto md:top-4 md:right-4 md:left-auto md:bottom-auto md:w-full md:max-w-sm rounded-lg flex flex-col gap-2',
    ...etc,
  );

export const toastRoot: ComponentFunction<ToastStyleProps> = (_props, ...etc) =>
  mx(
    'rounded-xl flex p-2 gap-2',
    chromeSurface,
    surfaceElevation({ elevation: 'chrome' }),
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
  mx('shrink-0 text-md font-medium', srOnly && 'sr-only', ...etc);

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

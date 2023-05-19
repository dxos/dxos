//
// Copyright 2023 DXOS.org
//

import { ComponentFunction, Theme } from '@dxos/aurora-types';

import { mx } from '../../util';
import { defaultFocus } from '../fragments';

export type DialogStyleProps = {};

export const dialogAppOverlay: ComponentFunction<DialogStyleProps> = (props, ...etc) =>
  mx('fixed inset-0 z-20 bg-transparent', ...etc);

export const dialogOsOverlay: ComponentFunction<DialogStyleProps> = (props, ...etc) =>
  mx('fixed inset-0 backdrop-blur z-50 overflow-auto grid place-items-center p-2 md:p-4 lg:p-8', ...etc);

export const dialogAppContent: ComponentFunction<DialogStyleProps> = (props, ...etc) =>
  mx(
    'flex flex-col',
    'fixed z-50',
    'w-[95vw] max-w-md rounded-xl p-4 md:w-full',
    'top-[50%] left-[50%] -translate-x-[50%] -translate-y-[50%]',
    'shadow-2xl bg-white dark:bg-neutral-800 elevated-buttons',
    defaultFocus,
    ...etc,
  );

export const dialogOsContent: ComponentFunction<DialogStyleProps> = (props, ...etc) =>
  mx('is-full min-is-[260px] max-is-[320px] rounded-md shadow-md backdrop-blur-md', ...etc);

export const dialogTheme: Theme<DialogStyleProps> = {
  overlay: dialogAppOverlay,
  content: dialogAppContent,
};

export const dialogOsTheme: Theme<DialogStyleProps> = {
  overlay: dialogOsOverlay,
  content: dialogOsContent,
};

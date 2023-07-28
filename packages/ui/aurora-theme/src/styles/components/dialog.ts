//
// Copyright 2023 DXOS.org
//

import { ComponentFunction, Elevation, Theme } from '@dxos/aurora-types';

import { mx } from '../../util';
import { descriptionText, focusRing, surfaceElevation, groupSurface } from '../fragments';

export type DialogStyleProps = {
  srOnly?: boolean;
  inOverlayLayout?: boolean;
  elevation?: Elevation;
};

const dialogLayoutFragment = 'overflow-auto grid place-items-center p-2 md:p-4 lg:p-8';

export const dialogOverlay: ComponentFunction<DialogStyleProps> = (_props, ...etc) =>
  mx('fixed z-20 inset-inline-0 block-start-0 bs-[100dvb]', dialogLayoutFragment, ...etc);

export const dialogOsOverlay: ComponentFunction<DialogStyleProps> = (_props, ...etc) =>
  mx('fixed z-40 inset-0 backdrop-blur', dialogLayoutFragment, ...etc);

export const dialogContent: ComponentFunction<DialogStyleProps> = ({ inOverlayLayout, elevation = 'chrome' }, ...etc) =>
  mx(
    'flex flex-col',
    !inOverlayLayout && 'fixed z-20 top-[50%] left-[50%] -translate-x-[50%] -translate-y-[50%]',
    'is-[95vw] md:is-full max-is-md rounded-xl p-4',
    surfaceElevation({ elevation }),
    groupSurface,
    focusRing,
    ...etc,
  );

export const dialogOsContent: ComponentFunction<DialogStyleProps> = (props, ...etc) =>
  mx('is-full min-is-[260px] max-is-[320px] rounded-md shadow-md backdrop-blur-md', ...etc);

export const dialogTitle: ComponentFunction<DialogStyleProps> = ({ srOnly }, ...etc) =>
  mx(
    'rounded shrink-0 text-xl font-system-medium text-neutral-900 dark:text-neutral-100',
    focusRing,
    srOnly && 'sr-only',
    ...etc,
  );

export const dialogDescription: ComponentFunction<DialogStyleProps> = ({ srOnly }, ...etc) =>
  mx('mlb-2', descriptionText, srOnly && 'sr-only', ...etc);

export const dialogTheme: Theme<DialogStyleProps> = {
  overlay: dialogOverlay,
  content: dialogContent,
  title: dialogTitle,
  description: dialogDescription,
};

export const dialogOsTheme: Theme<DialogStyleProps> = {
  overlay: dialogOsOverlay,
  content: dialogOsContent,
  title: dialogTitle,
  description: dialogDescription,
};

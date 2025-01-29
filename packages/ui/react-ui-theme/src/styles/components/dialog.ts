//
// Copyright 2023 DXOS.org
//

import { type ComponentFunction, type Elevation, type Theme } from '@dxos/react-ui-types';

import { mx } from '../../util';
import { descriptionText, focusRing, surfaceShadow, dialogMotion } from '../fragments';

export type DialogStyleProps = {
  srOnly?: boolean;
  inOverlayLayout?: boolean;
  elevation?: Elevation;
};

const dialogLayoutFragment =
  'overflow-auto grid place-items-center pbs-[env(safe-area-inset-top)] sm:p-[calc(env(safe-area-inset-top)+.5rem)] md:p-[calc(env(safe-area-inset-top)+1rem)] lg:p-[calc(env(safe-area-inset-top)+2rem)] data-[block-align=start]:justify-center data-[block-align=start]:items-start data-[block-align=center]:place-content-center';

export const dialogOverlay: ComponentFunction<DialogStyleProps> = (_props, ...etc) =>
  mx('fixed z-50 inset-inline-0 block-start-0 bs-[100dvh] bg-scrim', dialogLayoutFragment, ...etc);

export const dialogContent: ComponentFunction<DialogStyleProps> = ({ inOverlayLayout, elevation = 'chrome' }, ...etc) =>
  mx(
    // TODO(thure): `flex` should not be default.
    'flex flex-col',
    !inOverlayLayout && 'fixed z-50 top-[50%] left-[50%] -translate-x-[50%] -translate-y-[50%]',
    '@container is-dvw sm:is-[95vw] max-is-full md:max-is-[24rem] p-4 sm:border sm:rounded-lg sm:border-separator',
    dialogMotion,
    surfaceShadow({ elevation: 'dialog' }),
    'bg-modalSurface backdrop-blur',
    focusRing,
    ...etc,
  );

export const dialogTitle: ComponentFunction<DialogStyleProps> = ({ srOnly }, ...etc) =>
  mx('rounded shrink-0 text-xl font-medium', srOnly && 'sr-only', ...etc);

export const dialogDescription: ComponentFunction<DialogStyleProps> = ({ srOnly }, ...etc) =>
  mx('mlb-2', descriptionText, srOnly && 'sr-only', ...etc);

export const dialogTheme: Theme<DialogStyleProps> = {
  overlay: dialogOverlay,
  content: dialogContent,
  title: dialogTitle,
  description: dialogDescription,
};

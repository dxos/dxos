//
// Copyright 2023 DXOS.org
//

import { type ComponentFunction, type Elevation, type Theme } from '@dxos/react-ui-types';

import { mx } from '../../util';
import { descriptionText, focusRing, surfaceElevation, dialogMotion, groupBorder } from '../fragments';

export type DialogStyleProps = {
  srOnly?: boolean;
  inOverlayLayout?: boolean;
  elevation?: Elevation;
};

const dialogLayoutFragment = 'overflow-auto grid place-items-center p-2 md:p-4 lg:p-8';

export const dialogOverlay: ComponentFunction<DialogStyleProps> = (_props, ...etc) =>
  mx('fixed z-20 inset-inline-0 block-start-0 bs-[100dvh] surface-scrim', dialogLayoutFragment, ...etc);

export const dialogContent: ComponentFunction<DialogStyleProps> = ({ inOverlayLayout, elevation = 'chrome' }, ...etc) =>
  mx(
    // TODO(thure): `flex` should not be default.
    'flex flex-col',
    !inOverlayLayout && 'fixed z-20 top-[50%] left-[50%] -translate-x-[50%] -translate-y-[50%]',
    'is-[95vw] max-is-[24rem] border rounded-lg p-4',
    dialogMotion,
    surfaceElevation({ elevation }),
    'surface-baseGlass backdrop-blur',
    groupBorder,
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

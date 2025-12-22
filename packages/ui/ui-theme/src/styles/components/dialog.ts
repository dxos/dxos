//
// Copyright 2023 DXOS.org
//

import { type ComponentFunction, type Elevation, type Theme } from '@dxos/ui-types';

import { mx } from '../../util';
import { descriptionText } from '../fragments';

export type DialogStyleProps = {
  srOnly?: boolean;
  inOverlayLayout?: boolean;
  elevation?: Elevation;
};

export const dialogOverlay: ComponentFunction<DialogStyleProps> = (_props, ...etc) => mx('dx-dialog__overlay', ...etc);

export const dialogContent: ComponentFunction<DialogStyleProps> = ({ inOverlayLayout }, ...etc) =>
  mx(
    '@container dx-dialog__content dx-focus-ring modal-surface density-coarse',
    !inOverlayLayout && 'fixed z-50 top-[50%] left-[50%] -translate-x-[50%] -translate-y-[50%]',
    ...etc,
  );

export const dialogTitle: ComponentFunction<DialogStyleProps> = ({ srOnly }, ...etc) =>
  mx('dx-dialog__title', srOnly && 'sr-only', ...etc);

export const dialogDescription: ComponentFunction<DialogStyleProps> = ({ srOnly }, ...etc) =>
  mx('dx-dialog__description', descriptionText, srOnly && 'sr-only', ...etc);

export const dialogTheme: Theme<DialogStyleProps> = {
  overlay: dialogOverlay,
  content: dialogContent,
  title: dialogTitle,
  description: dialogDescription,
};

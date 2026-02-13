//
// Copyright 2023 DXOS.org
//

import { type ComponentFunction, type Elevation, type Theme } from '@dxos/ui-types';

import { mx } from '../../util';
import { descriptionText } from '../fragments';

export type DialogSize = 'sm' | 'md' | 'lg' | 'xl';

const sizeMap: Record<DialogSize, string> = {
  sm: 'md:!max-is-[24rem]',
  md: 'md:!max-is-[32rem]',
  lg: 'md:!max-is-[40rem]',
  xl: 'md:!max-is-[60rem]',
};

export type DialogStyleProps = {
  srOnly?: boolean;
  inOverlayLayout?: boolean;
  elevation?: Elevation;
  size?: DialogSize;
};

export const dialogOverlay: ComponentFunction<DialogStyleProps> = (_props, ...etc) => mx('dx-dialog__overlay', ...etc);

export const dialogContent: ComponentFunction<DialogStyleProps> = ({ inOverlayLayout, size }, ...etc) => {
  return mx(
    '@container dx-dialog__content dx-focus-ring modal-surface density-coarse is-full gap-2',
    !inOverlayLayout && 'fixed z-50 top-[50%] left-[50%] -translate-x-[50%] -translate-y-[50%]',
    size && sizeMap[size],
    ...etc,
  );
};

export const dialogHeader: ComponentFunction<DialogStyleProps> = (_props, ...etc) =>
  mx('dx-dialog__header flex items-center justify-between', ...etc);

export const dialogBody: ComponentFunction<DialogStyleProps> = (_props, ...etc) =>
  mx('dx-dialog__body flex flex-col bs-full overflow-hidden', ...etc);

export const dialogActionBar: ComponentFunction<DialogStyleProps> = (_props, ...etc) =>
  mx('dx-dialog__action-bar flex items-center', ...etc);

export const dialogTitle: ComponentFunction<DialogStyleProps> = ({ srOnly }, ...etc) =>
  mx('dx-dialog__title', srOnly && 'sr-only', ...etc);

export const dialogDescription: ComponentFunction<DialogStyleProps> = ({ srOnly }, ...etc) =>
  mx('dx-dialog__description', descriptionText, srOnly && 'sr-only', ...etc);

export const dialogTheme: Theme<DialogStyleProps> = {
  overlay: dialogOverlay,
  content: dialogContent,
  header: dialogHeader,
  body: dialogBody,
  title: dialogTitle,
  description: dialogDescription,
  actionbar: dialogActionBar,
};

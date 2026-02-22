//
// Copyright 2023 DXOS.org
//

import { type ComponentFunction, type Elevation, type Theme } from '@dxos/ui-types';

import { mx } from '../../util';
import { descriptionText } from '../fragments';

export type DialogSize = 'sm' | 'md' | 'lg' | 'xl';

const sizeMap: Record<DialogSize, string> = {
  sm: 'md:!max-inline-[24rem]',
  md: 'md:!max-inline-[32rem]',
  lg: 'md:!max-inline-[40rem]',
  xl: 'md:!max-inline-[60rem]',
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
    '@container dx-dialog__content dx-focus-ring modal-surface density-coarse inline-full gap-4',
    !inOverlayLayout && 'fixed z-50 top-[50%] left-[50%] -translate-x-[50%] -translate-y-[50%]',
    size && sizeMap[size],
    ...etc,
  );
};

export const dialogHeader: ComponentFunction<DialogStyleProps> = (_props, ...etc) =>
  mx('dx-dialog__header flex items-center justify-between', ...etc);

export const dialogBody: ComponentFunction<DialogStyleProps> = (_props, ...etc) =>
  mx('dx-dialog__body flex flex-col gap-4 block-full overflow-hidden', ...etc);

export const dialogActionBar: ComponentFunction<DialogStyleProps> = (_props, ...etc) =>
  mx('dx-dialog__actionbar flex items-center gap-2 density-coarse', ...etc);

export const dialogTitle: ComponentFunction<DialogStyleProps> = ({ srOnly }, ...etc) =>
  mx('dx-dialog__title', srOnly && 'sr-only', ...etc);

export const dialogDescription: ComponentFunction<DialogStyleProps> = ({ srOnly }, ...etc) =>
  mx('dx-dialog__description', descriptionText, srOnly && 'sr-only', ...etc);

export const dialogTheme: Theme<DialogStyleProps> = {
  overlay: dialogOverlay,
  content: dialogContent,
  header: dialogHeader,
  body: dialogBody,
  actionbar: dialogActionBar,
  title: dialogTitle,
  description: dialogDescription,
};

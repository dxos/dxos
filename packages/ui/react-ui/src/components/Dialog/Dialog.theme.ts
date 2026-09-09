//
// Copyright 2023 DXOS.org
//

import { mx } from '@dxos/ui-theme';
import { type ComponentFunction, type Elevation, type Surface, type Theme } from '@dxos/ui-types';

import { withColumn } from '../Column/withColumn';

export type DialogSize = 'sm' | 'md' | 'lg' | 'xl';

const sizeMap: Record<DialogSize, string> = {
  sm: 'md:max-w-[24rem]',
  md: 'md:max-w-[32rem]!',
  lg: 'md:max-w-[40rem]!',
  xl: 'md:max-w-[60rem]!',
};

export type DialogStyleProps = {
  srOnly?: boolean;
  inOverlayLayout?: boolean;
  elevation?: Elevation;
  size?: DialogSize;
  /** An explicit level, from `Content elevation`; the dialog then paints it instead of `overlay`. */
  surface?: Surface;
};

const overlay: ComponentFunction<DialogStyleProps> = (_props, ...etc) => mx('dx-dialog__overlay', ...etc);

const content: ComponentFunction<DialogStyleProps> = ({ inOverlayLayout, size = 'md', surface }, ...etc) => {
  return mx(
    '@container',
    'dx-dialog__content dx-focus-ring py-4',
    !surface && 'dx-modal-surface',
    !inOverlayLayout && 'fixed z-50 top-[50%] left-[50%] -translate-x-[50%] -translate-y-[50%]',
    sizeMap[size],
    ...etc,
  );
};

const header: ComponentFunction<DialogStyleProps> = (_props, ...etc) =>
  mx('dx-dialog__header flex pb-4 items-center justify-between', withColumn.center(), ...etc);

const body: ComponentFunction<DialogStyleProps> = (_props, ...etc) =>
  mx('dx-dialog__body dx-expand gap-y-2', withColumn.propagate(), ...etc);

const actionBar: ComponentFunction<DialogStyleProps> = (_props, ...etc) =>
  mx('dx-dialog__actionbar flex items-center pt-4 gap-2', withColumn.center(), ...etc);

const title: ComponentFunction<DialogStyleProps> = ({ srOnly }, ...etc) =>
  mx('dx-dialog__title', srOnly && 'sr-only', ...etc);

const description: ComponentFunction<DialogStyleProps> = ({ srOnly }, ...etc) =>
  mx('dx-dialog__description', 'text-description', srOnly && 'sr-only', ...etc);

export const dialogTheme: Theme<DialogStyleProps> = {
  overlay,
  content,
  header,
  body,
  actionbar: actionBar,
  title,
  description,
};

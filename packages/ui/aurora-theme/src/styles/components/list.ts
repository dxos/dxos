//
// Copyright 2023 DXOS.org
//

import { ComponentFunction, Density } from '@dxos/aurora-types';

import { mx } from '../../util';
import { coarseBlockSize, defaultFocus, fineBlockSize, osFocus } from '../fragments';

export type ListStyleProps = Partial<{
  density: Density;
}>;

export const listItemAppDragHandle: ComponentFunction<ListStyleProps> = (_props, ...options) =>
  mx('bs-10 is-5 rounded touch-none', defaultFocus, ...options);
export const listItemOsDragHandle: ComponentFunction<ListStyleProps> = (_props, ...options) =>
  mx('bs-10 is-5 rounded touch-none', osFocus, ...options);

export const listItemAppOpenTrigger: ComponentFunction<ListStyleProps> = (props, ...options) =>
  mx(
    'is-5 rounded flex justify-center items-center',
    props.density === 'fine' ? fineBlockSize : coarseBlockSize,
    defaultFocus,
    ...options
  );
export const listItemOsOpenTrigger: ComponentFunction<ListStyleProps> = (props, ...options) =>
  mx(
    'is-5 rounded flex justify-center items-center',
    props.density === 'fine' ? fineBlockSize : coarseBlockSize,
    osFocus,
    ...options
  );

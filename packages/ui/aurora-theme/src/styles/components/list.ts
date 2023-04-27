//
// Copyright 2023 DXOS.org
//

import { ComponentFunction, Density } from '@dxos/aurora-types';

import { mx } from '../../util';
import { coarseBlockSize, defaultFocus, densityBlockSize, fineBlockSize, getSize, osFocus } from '../fragments';

export type ListStyleProps = Partial<{
  density: Density;
}>;

export const listRoot: ComponentFunction<ListStyleProps> = (_, ...etc) => mx(...etc);

export const listItem: ComponentFunction<ListStyleProps> = (_, ...etc) => mx('flex', ...etc);

export const listItemEndcap: ComponentFunction<ListStyleProps> = ({ density }, ...etc) =>
  mx(density === 'fine' ? getSize(8) : getSize(10), 'shrink-0 flex items-start justify-center', ...etc);

export const listItemHeading: ComponentFunction<ListStyleProps> = ({ density }, ...etc) =>
  mx(densityBlockSize(density), ...etc);

export const listItemAppDragHandle: ComponentFunction<ListStyleProps> = (_props, ...etc) =>
  mx('bs-10 is-5 rounded touch-none', defaultFocus, ...etc);
export const listItemOsDragHandle: ComponentFunction<ListStyleProps> = (_props, ...etc) =>
  mx('bs-10 is-5 rounded touch-none', osFocus, ...etc);

export const listItemDragHandleIcon: ComponentFunction<ListStyleProps> = (_props, ...etc) =>
  mx(getSize(5), 'mbs-2.5', ...etc);

export const listItemAppOpenTrigger: ComponentFunction<ListStyleProps> = (props, ...etc) =>
  mx(
    'is-5 rounded flex justify-center items-center',
    props.density === 'fine' ? fineBlockSize : coarseBlockSize,
    defaultFocus,
    ...etc
  );
export const listItemOsOpenTrigger: ComponentFunction<ListStyleProps> = (props, ...etc) =>
  mx(
    'is-5 rounded flex justify-center items-center',
    props.density === 'fine' ? fineBlockSize : coarseBlockSize,
    osFocus,
    ...etc
  );
export const listItemOpenTriggerIcon: ComponentFunction<ListStyleProps> = (_props, ...etc) => mx(getSize(3.5), ...etc);

//
// Copyright 2023 DXOS.org
//

import { ComponentFunction, Density, Theme } from '@dxos/aurora-types';

import { mx } from '../../util';
import { focusRing, densityBlockSize, getSize } from '../fragments';

export type ListStyleProps = Partial<{
  density: Density;
  collapsible: boolean;
}>;

export const listRoot: ComponentFunction<ListStyleProps> = (_, ...etc) => mx(...etc);

export const listItem: ComponentFunction<ListStyleProps> = ({ collapsible }, ...etc) =>
  mx(!collapsible && 'flex', ...etc);

export const listItemEndcap: ComponentFunction<ListStyleProps> = ({ density }, ...etc) =>
  mx(density === 'fine' ? getSize(8) : getSize(10), 'shrink-0 flex items-start justify-center', ...etc);

export const listItemHeading: ComponentFunction<ListStyleProps> = ({ density }, ...etc) =>
  mx(densityBlockSize(density), ...etc);

export const listItemDragHandleIcon: ComponentFunction<ListStyleProps> = (_props, ...etc) =>
  mx(getSize(5), 'mbs-2.5', ...etc);

export const listItemOpenTrigger: ComponentFunction<ListStyleProps> = ({ density }, ...etc) =>
  mx('is-5 rounded flex justify-center items-center', densityBlockSize(density), focusRing, ...etc);
export const listItemOpenTriggerIcon: ComponentFunction<ListStyleProps> = (_props, ...etc) => mx(getSize(3.5), ...etc);

export const listTheme: Theme<ListStyleProps> = {
  root: listRoot,
  item: {
    root: listItem,
    endcap: listItemEndcap,
    heading: listItemHeading,
    dragHandleIcon: listItemDragHandleIcon,
    openTrigger: listItemOpenTrigger,
    openTriggerIcon: listItemOpenTriggerIcon,
  },
};

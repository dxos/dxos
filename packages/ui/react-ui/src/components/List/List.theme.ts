//
// Copyright 2023 DXOS.org
//

import { densityBlockSize, ghostHover } from '@dxos/ui-theme';
import { getSize, mx } from '@dxos/ui-theme';
import { type ComponentFunction, type Density, type Theme } from '@dxos/ui-types';

export type ListStyleProps = Partial<{
  density: Density;
  collapsible: boolean;
}>;

const listRoot: ComponentFunction<ListStyleProps> = (_, ...etc) => mx(...etc);

const listItem: ComponentFunction<ListStyleProps> = ({ collapsible }, ...etc) => mx(!collapsible && 'flex', ...etc);

const listItemEndcap: ComponentFunction<ListStyleProps> = ({ density }, ...etc) =>
  mx(
    density === 'lg' ? getSize(10) : density === 'sm' ? getSize(7) : getSize(8),
    'shrink-0 flex items-center justify-center',
    ...etc,
  );

const listItemHeading: ComponentFunction<ListStyleProps> = ({ density }, ...etc) =>
  mx(densityBlockSize(density), 'flex items-center overflow-hidden [&>span]:truncate', ...etc);

const listItemDragHandleIcon: ComponentFunction<ListStyleProps> = (_props, ...etc) => mx(getSize(5), 'mt-2.5', ...etc);

const listItemOpenTrigger: ComponentFunction<ListStyleProps> = ({ density }, ...etc) =>
  mx('w-5 rounded-sm flex justify-center items-center', densityBlockSize(density), ghostHover, 'dx-focus-ring', ...etc);

const listItemOpenTriggerIcon: ComponentFunction<ListStyleProps> = (_props, ...etc) => {
  return mx(getSize(5), ...etc);
};

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

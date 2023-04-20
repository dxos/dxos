//
// Copyright 2023 DXOS.org
//

import { Density } from '../../props';
import { densityBlockSize, getSize } from '../../styles';
import { mx } from '../../util';

export const defaultListItemEndcap = ({ density = 'coarse' }: { density?: Density }) =>
  mx(density === 'fine' ? getSize(8) : getSize(10), 'shrink-0 flex items-start justify-center');
export const defaultListItemHeading = ({ density = 'coarse' }: { density?: Density }) => densityBlockSize(density);

export const defaultListItemMainContent = ({ collapsible = false }: { collapsible?: boolean }) =>
  mx('flex-1 min-bs-0', !collapsible && 'flex');

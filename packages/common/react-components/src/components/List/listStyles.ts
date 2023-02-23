//
// Copyright 2023 DXOS.org
//

import { Density } from '../../props';
import { getSize } from '../../styles';
import { mx } from '../../util';

export const defaultListItemEndcap = ({ density = 'coarse' }: { density?: Density }) =>
  mx(density === 'fine' ? getSize(8) : getSize(10), 'shrink-0 flex items-start justify-center');
export const defaultListItemHeading = ({ density = 'coarse' }: { density?: Density }) =>
  mx(density === 'fine' ? 'min-bs-[32px]' : 'min-bs-[40px]', 'flex-1 min-is-0');

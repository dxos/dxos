//
// Copyright 2023 DXOS.org
//

import { type ComponentFunction, type Size, type Theme } from '@dxos/ui-types';

import { getSize } from '../../fragments';
import { mx } from '../../util';

export type IconStyleProps = {
  size?: Size;
};

/**
 * Size can be specified directly, or inherited from a container (e.g., toolbar).
 */
export const iconRoot: ComponentFunction<IconStyleProps> = ({ size }, etc) => {
  return mx(
    'shrink-0 text-[var(--icons-color,currentColor)]',
    size
      ? getSize(size)
      : '[width:var(--icon-size,var(--dx-default-icons-size))] [height:var(--icon-size,var(--dx-default-icons-size))]',
    etc,
  );
};

export const iconTheme: Theme<IconStyleProps> = {
  root: iconRoot,
};

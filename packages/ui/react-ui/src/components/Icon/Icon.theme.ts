//
// Copyright 2023 DXOS.org
//

import { getSize, mx } from '@dxos/ui-theme';
import { type ComponentFunction, type Size, type Theme } from '@dxos/ui-types';

export type IconStyleProps = {
  size?: Size;
};

export type IconBlockStyleProps = {
  compact?: boolean;
};

/**
 * Size can be specified directly, or inherited from a container (e.g., toolbar).
 */
const root: ComponentFunction<IconStyleProps> = ({ size }, etc) => {
  return mx(
    'shrink-0 text-[var(--icons-color,currentColor)]',
    size
      ? getSize(size)
      : '[width:var(--icon-size,var(--dx-default-icons-size))] [height:var(--icon-size,var(--dx-default-icons-size))]',
    etc,
  );
};

/**
 * Static slot sized to `--dx-rail-item` so a wrapped `Icon` lines up with an `IconButton iconOnly`.
 */
const block: ComponentFunction<IconBlockStyleProps> = ({ compact }, ...etc) =>
  mx('grid w-[var(--dx-rail-item)] place-items-center', compact ? '' : 'h-[var(--dx-rail-item)]', ...etc);

export const iconTheme: Theme<IconStyleProps & IconBlockStyleProps> = {
  root,
  block,
};

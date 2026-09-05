//
// Copyright 2022 DXOS.org
//

import { dataDisabled } from '@dxos/ui-theme';
import { mx, surfaceShadow, surfaceZIndex, surfaceZIndexVar } from '@dxos/ui-theme';
import { type ComponentFunction, type Elevation, type Theme } from '@dxos/ui-types';

export type MenuStyleProps = Partial<{
  constrainBlockSize: boolean;
  elevation: Elevation;
}>;

/**
 * The floating element. The machine positions it with an inline `z-index: var(--z-index)`, which
 * outranks any `z-*` class, so the layer is handed over through the variable.
 */
const positioner: ComponentFunction<MenuStyleProps> = ({ elevation }, ...etc) =>
  mx(surfaceZIndexVar({ elevation, level: 'menu' }), ...etc);

const content: ComponentFunction<MenuStyleProps> = ({ elevation }, ...etc) =>
  mx(
    'dx-popover-surface w-48 md:w-56 border border-separator rounded-sm',
    surfaceZIndex({ elevation, level: 'menu' }),
    surfaceShadow({ elevation: 'positioned' }),
    ...etc,
  );

// `--available-height` is set by the machine on the positioner, so it reaches here by inheritance.
const viewport: ComponentFunction<MenuStyleProps> = (_props, ...etc) =>
  mx('rounded-sm p-1 max-h-[var(--available-height)] overflow-y-auto', ...etc);

const item: ComponentFunction<MenuStyleProps> = (_props, ...etc) =>
  mx(
    'flex cursor-pointer select-none items-center gap-2 rounded-xs min-h-(--dx-control) px-(--dx-control-pad) py-1 text-sm',
    'hover:bg-hover-surface data-[highlighted]:bg-hover-surface',
    'dx-focus-subdued',
    dataDisabled,
    ...etc,
  );

const separator: ComponentFunction<MenuStyleProps> = (_props, ...etc) => mx('my-1 mx-2 h-px bg-separator', ...etc);

const groupLabel: ComponentFunction<MenuStyleProps> = (_props, ...etc) =>
  mx('text-description', 'select-none px-(--dx-control-pad) py-1', ...etc);

/** Two rotated squares painted from `--arrow-background`, matching the content's border. */
const arrow: ComponentFunction<MenuStyleProps> = (_props, ...etc) =>
  mx('[--arrow-size:12px] [--arrow-background:var(--color-separator)]', ...etc);

export const menuTheme: Theme<MenuStyleProps> = {
  positioner,
  content,
  viewport,
  item,
  separator,
  groupLabel,
  arrow,
};

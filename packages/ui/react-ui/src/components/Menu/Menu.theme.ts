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
    // The machine focuses the content on open; the ring belongs to the items, not the surface.
    'dx-popover-surface w-48 md:w-56 border border-separator rounded-sm outline-none',
    surfaceZIndex({ elevation, level: 'menu' }),
    surfaceShadow({ elevation: 'positioned' }),
    ...etc,
  );

// `--available-height` is set by the machine on the positioner, so it reaches here by inheritance.
const viewport: ComponentFunction<MenuStyleProps> = (_props, ...etc) =>
  mx('rounded-sm max-h-[var(--available-height)]', ...etc);

const viewportContent: ComponentFunction<MenuStyleProps> = (_props, ...etc) => mx('p-1', ...etc);

const item: ComponentFunction<MenuStyleProps> = (_props, ...etc) =>
  mx(
    'flex cursor-pointer select-none items-center gap-2 rounded-xs min-h-(--dx-control) px-(--dx-control-pad) py-1 text-sm',
    'hover:bg-hover-surface data-[highlighted]:bg-hover-surface',
    'dx-focus-subdued',
    dataDisabled,
    ...etc,
  );

const separator: ComponentFunction<MenuStyleProps> = (_props, ...etc) =>
  mx('my-1 mx-2 h-px bg-subdued-separator', ...etc);

const groupLabel: ComponentFunction<MenuStyleProps> = (_props, ...etc) =>
  mx('text-description', 'select-none px-(--dx-control-pad) py-1', ...etc);

/**
 * Zag's arrow is a square straddling the content's edge, rotated so its top-left corner points
 * outward. Painted in the surface colour with the border on those two edges, its inner half covers
 * the content's border and the outline appears to bend around the tip. The content's backdrop
 * filter makes it the arrow's containing block, whose padding box starts inside the border, so
 * `positioning.css` moves the arrow outward by `--arrow-inset`, the border width, to meet the
 * border's outer edge.
 */
const arrow: ComponentFunction<MenuStyleProps> = (_props, ...etc) =>
  mx(
    '[--arrow-size:12px] [--arrow-background:var(--surface-bg)] [--arrow-inset:1px]',
    '[&>[data-part=arrow-tip]]:border-separator [&>[data-part=arrow-tip]]:border-t [&>[data-part=arrow-tip]]:border-l',
    ...etc,
  );

export const menuTheme: Theme<MenuStyleProps> = {
  positioner,
  content,
  viewport,
  viewportContent,
  item,
  separator,
  groupLabel,
  arrow,
};

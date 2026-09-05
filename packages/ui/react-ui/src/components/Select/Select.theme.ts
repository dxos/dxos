//
// Copyright 2022 DXOS.org
//

import { mx, surfaceShadow, surfaceZIndexVar } from '@dxos/ui-theme';
import { type ComponentFunction, type Elevation, type Theme } from '@dxos/ui-types';

export type SelectStyleProps = Partial<{
  elevation: Elevation;
}>;

// The positioner's inline `z-index: var(--z-index)` outranks any class, so the variable is set instead.
const positioner: ComponentFunction<SelectStyleProps> = ({ elevation }, ...etc) =>
  mx(surfaceZIndexVar({ elevation, level: 'menu' }), ...etc);

// `--reference-width` and `--available-height` are set by the machine on the positioner.
const content: ComponentFunction<SelectStyleProps> = (_props, ...etc) => {
  return mx(
    'dx-modal-surface rounded-sm border border-separator flex flex-col overflow-hidden',
    'min-w-(--reference-width) max-h-(--available-height)',
    surfaceShadow({ elevation: 'positioned' }),
    ...etc,
  );
};

const triggerButton: ComponentFunction<SelectStyleProps> = (_props, ...etc) =>
  mx('bg-input-surface grid grid-cols-[1fr_auto] [&>span]:text-left', ...etc);

const viewport: ComponentFunction<SelectStyleProps> = (_props, ...etc) => mx('overflow-y-auto', ...etc);

const item: ComponentFunction<SelectStyleProps> = (_props, ...etc) =>
  mx(
    'flex items-center min-h-(--dx-control) px-(--dx-control-pad) py-1 gap-2',
    'text-base-fg leading-none select-none outline-hidden',
    '[&>svg]:invisible [&[data-state=checked]>svg]:visible',
    'dx-highlighted',
    ...etc,
  );

const itemIndicator: ComponentFunction<SelectStyleProps> = (_props, ...etc) => mx('items-center', ...etc);

const separator: ComponentFunction<SelectStyleProps> = (_props, ...etc) =>
  mx('self-stretch border-b my-1 border-separator', ...etc);

export const selectTheme: Theme<SelectStyleProps> = {
  positioner,
  content,
  triggerButton,
  viewport,
  item,
  itemIndicator,
  separator,
};

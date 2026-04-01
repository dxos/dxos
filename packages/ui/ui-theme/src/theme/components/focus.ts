//
// Copyright 2026 DXOS.org
//

import { type ComponentFunction, type Theme } from '@dxos/ui-types';

import { mx } from '../../util';

export type FocusStyleProps = {
  border?: boolean;
};

/**
 * Focus ring styles shared by Focus.Group and Focus.Item.
 * Uses a `::after` pseudo-element overlay so the ring paints above child content
 * (inset box-shadow alone is obscured by children with backgrounds).
 * The pseudo-element is `pointer-events-none` and absolutely positioned over the element.
 * When `border` is true, a subdued CSS border is always visible (e.g., for grid cell edges).
 */
const focusRing: ComponentFunction<FocusStyleProps> = ({ border }, ...etc) =>
  mx(
    'dx-ring-pseudo outline-hidden',
    'focus:after:ring-neutral-focus-indicator',
    // 'data-[focus-state=active]:after:ring-neutral-focus-indicator',
    'data-[focus-state=error]:after:ring-rose-500',
    border && 'border border-separator',
    ...etc,
  );

export const focusTheme: Theme<FocusStyleProps> = {
  group: focusRing,
  item: focusRing,
};

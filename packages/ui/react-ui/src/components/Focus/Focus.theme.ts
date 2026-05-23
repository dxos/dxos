//
// Copyright 2026 DXOS.org
//

import { mx } from '@dxos/ui-theme';
import { type ComponentFunction, type Theme } from '@dxos/ui-types';

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
const ring: ComponentFunction<FocusStyleProps> = ({ border }, ...etc) =>
  mx(
    'dx-ring-pseudo outline-hidden',
    'focus:after:ring-focus-ring-subtle',
    'data-[focus-state=active]:after:ring-focus-ring-subtle',
    'data-[focus-state=error]:after:ring-rose-500',
    border && 'border border-separator',
    ...etc,
  );

export const focusTheme: Theme<FocusStyleProps> = {
  group: ring,
  item: ring,
};

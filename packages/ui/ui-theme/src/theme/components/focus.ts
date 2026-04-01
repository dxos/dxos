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
const focusGroup: ComponentFunction<FocusStyleProps> = ({ border }, ...etc) =>
  mx(
    // Base: relative for pseudo-element positioning, suppress default outline.
    'relative outline-hidden',
    // Optional always-visible border.
    border && 'border border-separator',
    // Pseudo-element overlay for focus ring.
    'after:content-[""] after:absolute after:inset-0 after:rounded-[inherit] after:pointer-events-none after:ring after:ring-inset after:ring-transparent',
    'focus:after:ring-neutral-focus-indicator',
    'data-[focus-state=active]:after:ring-neutral-focus-indicator',
    'data-[focus-state=error]:after:ring-rose-500',
    ...etc,
  );

const focusItem: ComponentFunction<FocusStyleProps> = ({ border }, ...etc) =>
  mx(
    'relative outline-hidden',
    border && 'border border-separator',
    'after:content-[""] after:absolute after:inset-0 after:rounded-[inherit] after:pointer-events-none after:ring after:ring-inset after:ring-transparent',
    'focus:after:ring-neutral-focus-indicator',
    'data-[focus-state=active]:after:ring-neutral-focus-indicator',
    'data-[focus-state=error]:after:ring-rose-500',
    ...etc,
  );

export const focusTheme: Theme<FocusStyleProps> = {
  group: focusGroup,
  item: focusItem,
};

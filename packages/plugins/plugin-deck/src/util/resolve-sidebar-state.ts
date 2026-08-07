//
// Copyright 2026 DXOS.org
//

import * as DeckSchema from '../types/DeckSchema';

export type SidebarState = DeckSchema.StoredDeckState['sidebarState'];

/**
 * Resolves the navigation sidebar state for the current breakpoint.
 *
 * `closed` only describes the dismissed drawer below `lg`: at `lg`+ it renders L0 zero-width and
 * inert while every control that could restore it is either `lg:hidden` or inside L0 itself, so a
 * `closed` value written below the breakpoint (e.g. while resizing across it) would otherwise
 * persist into desktop widths and leave no affordance to bring L0 back.
 */
export const resolveSidebarState = (state: SidebarState, isLg: boolean): SidebarState =>
  isLg && state === 'closed' ? 'collapsed' : state;

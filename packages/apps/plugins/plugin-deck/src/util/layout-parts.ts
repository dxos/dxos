//
// Copyright 2024 DXOS.org
//

import { type LayoutMode, type LayoutPart } from '@dxos/app-framework';

/**
 * If in solo mode and the part is the main part, open it in solo mode.
 * From the dispatch POV we refer to both 'solo' and 'main' as 'main'.
 */
export const getEffectivePart = (partName: LayoutPart, layoutMode: LayoutMode): LayoutPart =>
  layoutMode === 'solo' && partName === 'main' ? 'solo' : partName;

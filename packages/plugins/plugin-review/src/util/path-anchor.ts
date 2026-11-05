//
// Copyright 2026 DXOS.org
//

import { AnchoredTo } from '@dxos/types';

/**
 * Whether a thread's anchor names a field path that no longer resolves in its object. Other anchors (cursor ranges,
 * cells) are their editors' to reconcile.
 */
export const isOrphaned = (
  anchor: string | undefined,
  getText: ((anchor: string) => string | undefined) | undefined,
): boolean => !!anchor && !!getText && !!AnchoredTo.parsePathAnchor(anchor) && getText(anchor) === undefined;

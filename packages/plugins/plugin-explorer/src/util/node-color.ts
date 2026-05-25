//
// Copyright 2026 DXOS.org
//

import { Obj } from '@dxos/echo';
import { getHashHue } from '@dxos/ui-theme';

/**
 * Returns the SVG `fill` value for a node, derived from its typename via the
 * same hue-hash used by the force-directed renderer. Resolves to a Tailwind
 * color token CSS variable so the value reads consistently across themes.
 *
 * Used by every variant of `ExplorerArticle` so nodes are colored consistently
 * regardless of which layout is rendering them.
 */
export const getNodeFillForTypename = (typename: string | undefined): string => {
  return `var(--color-${getHashHue(typename)}-400)`;
};

/** Convenience: derive the fill from an ECHO object's typename. */
export const getNodeFillForObject = (object: Obj.Unknown | undefined): string => {
  return getNodeFillForTypename(object && Obj.getTypename(object));
};

//
// Copyright 2026 DXOS.org
//

import { type SuggestionSource } from '@dxos/ui-editor';

/**
 * A resolved suggestion branch: its author (identity DID) and current content. The review layer
 * enumerates a document's active `kind:'suggestion'` branches and binds each to read `content`.
 */
export type ResolvedSuggestionBranch = {
  author: string;
  content: string;
};

/**
 * Deterministic colour for a suggestion author, keyed by identity DID. Stable across sessions and
 * peers (same DID → same hue) so a suggestion reads with a consistent colour; intended to align with
 * the collaboration awareness cursor palette, which is also DID-seeded.
 */
export const suggestionColour = (author: string): string => {
  // FNV-1a over the DID → hue. Fixed saturation/lightness keeps every author's colour legible as
  // both text and underline on light and dark surfaces.
  let hash = 0x811c9dc5;
  for (let index = 0; index < author.length; index++) {
    hash ^= author.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 65% 50%)`;
};

/**
 * Build the {@link SuggestionSource}s the multi-author overlay renders from a document's resolved
 * suggestion branches — one source per author, coloured by {@link suggestionColour}. Ordered by
 * author DID so overlapping hunks stack deterministically regardless of branch enumeration order.
 */
export const buildSuggestionSources = (branches: ResolvedSuggestionBranch[]): SuggestionSource[] =>
  branches
    .map(({ author, content }) => ({ author, colour: suggestionColour(author), content }))
    .sort((a, b) => (a.author < b.author ? -1 : a.author > b.author ? 1 : 0));

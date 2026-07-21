//
// Copyright 2026 DXOS.org
//

import { type DiffHunk, type GroupPolicy, type SuggestionSource, diffHunks, groupHunks } from '@dxos/ui-editor';

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

/** One reviewable suggestion card: a grouped change from a single author, anchored in the base text. */
export type SuggestionGroup = DiffHunk & {
  author: string;
  colour: string;
};

/** Stable, position-independent key for a suggestion group (author + change). */
export const suggestionGroupKey = (group: SuggestionGroup): string =>
  `${group.author} ${group.removed} ${group.inserted}`;

/**
 * Flatten every {@link SuggestionSource} into the per-author grouped changes the review layer renders
 * as cards — one card per {@link groupHunks} group. Anchored in `base`, ordered by offset then author
 * so the card list matches the editor overlay's stacking order.
 */
export const suggestionGroups = (base: string, sources: SuggestionSource[], policy?: GroupPolicy): SuggestionGroup[] =>
  sources
    .flatMap((source) => {
      const hunks = policy
        ? groupHunks(diffHunks(base, source.content), base, policy)
        : diffHunks(base, source.content);
      return hunks.map((hunk) => ({ ...hunk, author: source.author, colour: source.colour }));
    })
    .sort((a, b) => a.from - b.from || a.to - b.to || (a.author < b.author ? -1 : a.author > b.author ? 1 : 0));

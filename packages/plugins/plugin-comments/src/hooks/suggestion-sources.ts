//
// Copyright 2026 DXOS.org
//

import { type DiffHunk, type GroupPolicy, type SuggestionSource, diffHunks, groupHunks } from '@dxos/ui-editor';
import { idHue, stringToHue } from '@dxos/util';

/**
 * A resolved suggestion branch: its author (identity DID) and current content. The review layer
 * enumerates a document's active `kind:'suggestion'` branches and binds each to read `content`.
 */
export type ResolvedSuggestionBranch = {
  author: string;
  content: string;
  /**
   * The author's palette hue (from their identity), when known. Aligns the suggestion's colour with
   * the author's avatar/tag colour; absent ⇒ a stable hue is derived from the author id.
   */
  hue?: string;
};

/**
 * Resolve a suggestion author's palette hue: their identity-derived hue when known (so it matches the
 * author's avatar/tag colour), else a stable hue seeded from the author id. One of the shared
 * {@link idHue} palette entries, so it maps to the same `--color-<hue>-*` tokens used everywhere else.
 */
export const suggestionHue = (author: string, hue?: string): (typeof idHue)[number] =>
  idHue.find((entry) => entry === hue) ?? stringToHue(author);

/**
 * CSS text colour for a suggestion author, from the shared hue palette — the same colour the author's
 * avatar/tag uses. Drives both the inline editor markers and the review cards so a suggestion reads
 * with its author's consistent colour across surfaces.
 */
export const suggestionColour = (author: string, hue?: string): string =>
  `var(--color-${suggestionHue(author, hue)}-text)`;

/**
 * Build the {@link SuggestionSource}s the multi-author overlay renders from a document's resolved
 * suggestion branches — one source per author, coloured by {@link suggestionColour}. Ordered by
 * author DID so overlapping hunks stack deterministically regardless of branch enumeration order.
 */
export const buildSuggestionSources = (branches: ResolvedSuggestionBranch[]): SuggestionSource[] =>
  branches
    .map(({ author, content, hue }) => ({ author, colour: suggestionColour(author, hue), content }))
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

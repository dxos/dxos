//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type GroupPolicy } from '@dxos/ui-editor';
import { Branch } from '@dxos/versioning';

import { type SuggestionGroup, buildSuggestionSources } from '../../hooks';
import { SuggestionSources } from './SuggestionSources';
import { SuggestionThread } from './SuggestionThread';

type VersionedObject = Parameters<typeof Branch.bind>[0];

// Coalesce an author's contiguous / close edits into one card, but keep edits in different blocks
// separate. `maxGap` bridges short unchanged runs (whitespace, a word or two) so a rewritten phrase
// reads as a single suggestion; widen it (via the `group` prop) to also group same-sentence edits.
const DEFAULT_GROUP: GroupPolicy = { maxGap: 24, respectBlockBoundaries: true };

export type SuggestionsProps = {
  /** The versioned document whose `kind:'suggestion'` branches are reviewed. */
  document?: VersionedObject;
  /** The base (main) content every suggestion branch is diffed against. */
  base: string;
  group?: GroupPolicy;
  authorLabels?: Record<string, string>;
  /** Author palette hues keyed by DID; aligns each suggestion's colour with its author's avatar/tag. */
  authorHues?: Record<string, string>;
  onAccept?: (group: SuggestionGroup) => void;
  onReject?: (group: SuggestionGroup) => void;
};

/**
 * Review companion for a document's suggestion branches: enumerates the active `kind:'suggestion'`
 * branches (via {@link SuggestionSources}) and renders them as change-block tiles (see
 * {@link SuggestionThread}). Each branch's content is tracked reactively so a suggestion
 * appears/updates as its author edits, and disappears when accepted/rejected leaves it empty.
 */
export const Suggestions = ({
  document,
  base,
  group,
  authorLabels,
  authorHues,
  onAccept,
  onReject,
}: SuggestionsProps) => {
  if (!document) {
    return null;
  }

  return (
    <SuggestionSources document={document} authorHues={authorHues}>
      {(resolved) => (
        <SuggestionThread
          base={base}
          sources={buildSuggestionSources(resolved)}
          group={group ?? DEFAULT_GROUP}
          authorLabels={authorLabels}
          authorHues={authorHues}
          onAccept={onAccept}
          onReject={onReject}
        />
      )}
    </SuggestionSources>
  );
};

Suggestions.displayName = 'Suggestions';

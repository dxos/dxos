//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { useTranslation } from '@dxos/react-ui';
import { type GroupPolicy, type SuggestionSource } from '@dxos/ui-editor';

import { meta } from '#meta';

import { type SuggestionGroup, suggestionGroups } from '../../hooks';
import { SuggestionCard } from './SuggestionCard';

/** Stable, position-independent key for a suggestion group (author + change). */
export const suggestionGroupKey = (group: SuggestionGroup): string =>
  `${group.author} ${group.removed} ${group.inserted}`;

export type SuggestionListProps = {
  /** The base document text every source is diffed against (the editor's current content). */
  base: string;
  sources: SuggestionSource[];
  group?: GroupPolicy;
  /** Human-readable author labels keyed by DID; falls back to the raw author id. */
  authorLabels?: Record<string, string>;
  currentKey?: string;
  /** Group keys hidden this session (rejected) — a view-only dismissal that doesn't alter the base. */
  dismissed?: ReadonlySet<string>;
  onAccept?: (group: SuggestionGroup) => void;
  onReject?: (group: SuggestionGroup) => void;
  onSelect?: (group: SuggestionGroup) => void;
};

/**
 * The review list: one {@link SuggestionCard} per grouped change across every author's suggestion
 * branch, derived live from the base text (so accepting/rejecting a change re-diffs the rest). The
 * card-list counterpart to the editor's multi-author `suggestions` overlay.
 */
export const SuggestionList = ({
  base,
  sources,
  group,
  authorLabels,
  currentKey,
  dismissed,
  onAccept,
  onReject,
  onSelect,
}: SuggestionListProps) => {
  const { t } = useTranslation(meta.profile.key);
  const groups = useMemo(
    () =>
      suggestionGroups(base, sources, group).filter((suggestion) => !dismissed?.has(suggestionGroupKey(suggestion))),
    [base, sources, group, dismissed],
  );

  if (groups.length === 0) {
    return <p className='pli-3 plb-2 text-sm text-subdued'>{t('no-suggestions.message')}</p>;
  }

  return (
    <div role='list' data-testid='suggestion-list'>
      {groups.map((suggestion) => {
        const key = suggestionGroupKey(suggestion);
        return (
          <SuggestionCard
            key={key}
            group={suggestion}
            authorLabel={authorLabels?.[suggestion.author]}
            current={currentKey === key}
            onAccept={onAccept}
            onReject={onReject}
            onSelect={onSelect}
          />
        );
      })}
    </div>
  );
};

SuggestionList.displayName = 'SuggestionList';

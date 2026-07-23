//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { type MarkdownCapabilities } from '@dxos/plugin-markdown/types';

import { buildSuggestionSources } from '../../hooks';
import { SuggestionSources } from './SuggestionSources';

/**
 * Adapter contributed to {@link MarkdownCapabilities.SuggestionSourcesProvider}: wraps the headless
 * {@link SuggestionSources} enumerator and maps its resolved branches to the aggregated
 * {@link SuggestionSource}s the editor's ambient overlay consumes — keeping the branch-resolution
 * logic in plugin-comments while the markdown editor stays free of a reverse dependency.
 */
export const SuggestionSourcesProvider = ({
  document,
  authorHues,
  onSources,
}: MarkdownCapabilities.SuggestionSourcesProviderProps) => {
  const handleResolved = useCallback(
    (resolved: Parameters<typeof buildSuggestionSources>[0]) => onSources(buildSuggestionSources(resolved)),
    [onSources],
  );

  return <SuggestionSources document={document} authorHues={authorHues} onResolved={handleResolved} />;
};

SuggestionSourcesProvider.displayName = 'SuggestionSourcesProvider';

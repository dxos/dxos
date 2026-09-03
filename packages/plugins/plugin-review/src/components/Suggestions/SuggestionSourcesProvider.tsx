//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import type * as Markdown from '@dxos/plugin-markdown/Markdown';
import { type SuggestionSource } from '@dxos/ui-editor';

import { buildSuggestionSources } from '#hooks';

import { SuggestionSources } from './SuggestionSources.tsx';

export type SuggestionSourcesProviderProps = {
  /** The versioned document whose active `kind:'suggestion'` branches are enumerated. */
  document?: Markdown.Document;
  /** Author palette hues keyed by DID, forwarded so each source keeps its author's colour. */
  authorHues?: Record<string, string>;
  /** Emits the aggregated per-author suggestion sources whenever the resolved set changes. */
  onSources: (sources: SuggestionSource[]) => void;
};

/**
 * Wraps the headless {@link SuggestionSources} enumerator and maps its resolved branches to the
 * aggregated {@link SuggestionSource}s the editor's ambient suggestion overlay consumes.
 */
export const SuggestionSourcesProvider = ({ document, authorHues, onSources }: SuggestionSourcesProviderProps) => {
  const handleResolved = useCallback(
    (resolved: Parameters<typeof buildSuggestionSources>[0]) => onSources(buildSuggestionSources(resolved)),
    [onSources],
  );

  return <SuggestionSources document={document} authorHues={authorHues} onResolved={handleResolved} />;
};

SuggestionSourcesProvider.displayName = 'SuggestionSourcesProvider';

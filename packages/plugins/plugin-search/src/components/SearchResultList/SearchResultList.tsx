//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/react-ui';
import { Listbox } from '@dxos/react-ui-list';
import { Highlighted, type SearchResult } from '@dxos/react-ui-search';

import { meta } from '#meta';

export type SearchResultListProps = {
  /** Matched objects to render, already ranked. */
  results: SearchResult[];
  /** Current search query, used to highlight matches. */
  query: string;
  /** Called when a row is activated. */
  onSelect?: (result: SearchResult) => void;
};

/**
 * Dense, read-only search-results list: each row shows the matched object's icon, highlighted
 * title and best-match snippet, and its type as trailing metadata. Built on `Listbox` with no selection.
 */
export const SearchResultList = ({ results, query, onSelect }: SearchResultListProps) => {
  const { t } = useTranslation(meta.profile.key);
  return (
    <Listbox.Root items={results.map((result) => ({ value: result.id, label: result.label ?? '' }))}>
      <Listbox.Content aria-label={t('search-result-list.label')}>
        {results.map((result) => (
          <Listbox.Item key={result.id} id={result.id} onClick={() => onSelect?.(result)}>
            <Listbox.ItemIcon icon={result.icon} />
            <Listbox.ItemText>
              <Highlighted text={result.label ?? ''} query={query} />
            </Listbox.ItemText>
            {result.snippet && (
              <Listbox.ItemDescription>
                <Highlighted text={result.snippet} query={query} />
              </Listbox.ItemDescription>
            )}
            {result.type && <span className='shrink-0 text-sm text-fg-muted'>{result.type}</span>}
          </Listbox.Item>
        ))}
      </Listbox.Content>
      <Listbox.Empty>{t('search-result-list.empty.label')}</Listbox.Empty>
    </Listbox.Root>
  );
};

SearchResultList.displayName = 'SearchResultList';

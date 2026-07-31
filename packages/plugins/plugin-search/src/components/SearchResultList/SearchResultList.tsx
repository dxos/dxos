//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/react-ui';
import { Empty, Listbox } from '@dxos/react-ui-list';
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
 * title and best-match snippet, and its type as trailing metadata. Built on `Listbox` in its
 * plain (non-selectable) mode — rows are `role=listitem`, not `role=option`.
 */
export const SearchResultList = ({ results, query, onSelect }: SearchResultListProps) => {
  const { t } = useTranslation(meta.profile.key);
  return (
    <Listbox.Root>
      <Listbox.Viewport>
        {results.length === 0 ? (
          // `Empty` renders a `<div>`; keep it out of `Listbox.Content`'s `<ul>` rather than
          // nesting a non-`<li>` child inside the list.
          <Empty label={t('search-result-list.empty.label')} />
        ) : (
          <Listbox.Content aria-label={t('search-result-list.label')}>
            {results.map((result) => (
              <Listbox.Item
                key={result.id}
                id={result.id}
                classNames='grid grid-cols-[1fr_auto] items-center gap-2'
                onClick={() => onSelect?.(result)}
              >
                <Listbox.ItemContent
                  icon={result.icon}
                  title={<Highlighted text={result.label ?? ''} query={query} />}
                  description={result.snippet ? <Highlighted text={result.snippet} query={query} /> : undefined}
                />
                {result.type ? <span className='shrink-0 text-sm text-description'>{result.type}</span> : null}
              </Listbox.Item>
            ))}
          </Listbox.Content>
        )}
      </Listbox.Viewport>
    </Listbox.Root>
  );
};

SearchResultList.displayName = 'SearchResultList';

//
// Copyright 2025 DXOS.org
//

import commandScore from 'command-score';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type UseSearchListResultsOptions<T> = {
  /** Items to filter. */
  items: T[];
  /** Custom filter function. Defaults to filtering by extracted string. */
  filter?: (item: T, query: string) => boolean;
  /** Enable fuzzy filtering using command-score algorithm. Defaults to true. */
  fuzzy?: boolean;
  /** Custom function to extract the searchable string from an item. Defaults to accessing 'label' property if it exists. */
  extract?: (item: T) => string;
  /** Minimum score threshold for fuzzy matches (0-1). Defaults to 0. */
  minScore?: number;
};

/**
 * Hook to manage search results with fuzzy filtering (enabled by default).
 * Returns filtered results and a handleSearch function to pass to SearchList.Root.
 *
 * @example
 * // Default fuzzy filtering using command-score (tries to extract from 'label' property)
 * const { results, handleSearch } = useSearchListResults({ items });
 *
 * @example
 * // Disable fuzzy for basic case-insensitive substring match
 * const { results, handleSearch } = useSearchListResults({ items, fuzzy: false });
 *
 * @example
 * // Custom extraction for fuzzy filtering
 * const { results, handleSearch } = useSearchListResults({
 *   items,
 *   extract: (item) => `${item.name} ${item.description}`,
 * });
 */
export const useSearchListResults = <T = unknown>({
  items,
  filter,
  fuzzy = true,
  extract,
  minScore = 0,
}: UseSearchListResultsOptions<T>) => {
  const [query, setQuery] = useState<string>('');
  const queryRef = useRef<string>('');

  // Update results when items change.
  useEffect(() => {
    queryRef.current = '';
    setQuery('');
  }, [items]);

  const defaultExtract = useCallback((item: T) => {
    // If item is a string, return it directly
    if (typeof item === 'string') {
      return item;
    }
    // Otherwise, try to access 'label' property
    return (item as any)?.label ?? '';
  }, []);
  const extractFn = extract ?? defaultExtract;

  const defaultFilter = useCallback(
    (item: T, query: string) => {
      const searchable = extractFn(item);
      return searchable.toLowerCase().includes(query.toLowerCase());
    },
    [extractFn],
  );

  const filterFn = filter ?? defaultFilter;

  const handleSearch = useCallback((searchQuery: string) => {
    queryRef.current = searchQuery;
    setQuery(searchQuery);
  }, []);

  const results = useMemo(() => {
    const currentQuery = queryRef.current;
    if (!currentQuery) {
      return items;
    }

    if (fuzzy) {
      // Score and filter items using command-score.
      const scored = items
        .map((item) => ({
          item,
          score: commandScore(extractFn(item), currentQuery) as number,
        }))
        .filter(({ score }) => score > minScore)
        .sort((a, b) => b.score - a.score);

      return scored.map(({ item }) => item);
    } else {
      return items.filter((item) => filterFn(item, currentQuery));
    }
  }, [items, query, filterFn, fuzzy, extractFn, minScore]);

  return { results, handleSearch };
};

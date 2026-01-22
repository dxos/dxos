//
// Copyright 2023 DXOS.org
//

import React, { type PropsWithChildren, createContext, useCallback, useContext, useState } from 'react';

import { raise } from '@dxos/debug';
import { GlobalFilterProvider } from '@dxos/react-ui-searchlist';

import { type SearchResult } from '../types';

import { filterObjectsSync, queryStringToMatch } from './sync';

// Re-export for backward compatibility.
export { useGlobalFilteredObjects, GlobalFilterProvider } from '@dxos/react-ui-searchlist';

type SearchContextType = {
  match?: RegExp;
  setMatch?: (text?: string) => void;
};

const SearchContext = createContext<SearchContextType>({});

/**
 * Provider for global search context.
 * Also provides the GlobalFilterProvider for useGlobalFilteredObjects to work.
 */
export const SearchContextProvider = ({ children }: PropsWithChildren) => {
  const [match, setMatch] = useState<RegExp>();
  const handleMatch = (text?: string) => setMatch(queryStringToMatch(text));

  // Provide a filter function for useGlobalFilteredObjects.
  const filterFn = useCallback(
    <T extends Record<string, any>>(objects: T[]): T[] => {
      if (!match) {
        return objects;
      }
      return filterObjectsSync(objects, match).map((result) => result.object as T);
    },
    [match],
  );

  return (
    <SearchContext.Provider value={{ match, setMatch: handleMatch }}>
      <GlobalFilterProvider filter={filterFn}>{children}</GlobalFilterProvider>
    </SearchContext.Provider>
  );
};

export const useGlobalSearch = () => {
  return useContext(SearchContext) ?? raise(new Error('Missing SearchContext.'));
};

export const useGlobalSearchResults = <T extends Record<string, any>>(objects?: T[]): SearchResult[] => {
  const { match } = useGlobalSearch();
  return objects && match ? filterObjectsSync(objects, match) : [];
};

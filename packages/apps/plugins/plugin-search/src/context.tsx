//
// Copyright 2023 DXOS.org
//

import React, { createContext, type PropsWithChildren, useContext, useState } from 'react';

import { raise } from '@dxos/debug';

import { filterObjectsSync, queryStringToMatch, type SearchResult } from './search-sync';

type SearchContextType = {
  match?: RegExp;
  setMatch?: (text?: string) => void;
};

const SearchContext = createContext<SearchContextType>({});

export const SearchContextProvider = ({ children }: PropsWithChildren) => {
  const [match, setMatch] = useState<RegExp>();
  const handleMatch = (text?: string) => setMatch(queryStringToMatch(text));
  return <SearchContext.Provider value={{ match, setMatch: handleMatch }}>{children}</SearchContext.Provider>;
};

export const useGlobalSearch = () => {
  return useContext(SearchContext) ?? raise(new Error('Missing SearchContext.'));
};

export const useGlobalSearchResults = <T extends Record<string, any>>(objects?: T[]): SearchResult[] => {
  const { match } = useGlobalSearch();
  return objects && match ? filterObjectsSync(objects, match) : [];
};

export const useGlobalFilteredObjects = <T extends Record<string, any>>(objects?: T[]): T[] => {
  const { match } = useGlobalSearch();
  if (!match || !objects) {
    return objects ?? [];
  }

  const matching = filterObjectsSync(objects, match);
  return matching.map((result) => result.object);
};

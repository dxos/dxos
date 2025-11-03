//
// Copyright 2023 DXOS.org
//

import React, { type PropsWithChildren, createContext, useContext, useMemo, useState } from 'react';

import { raise } from '@dxos/debug';

import { type SearchResult } from '../types';

import { filterObjectsSync, queryStringToMatch } from './sync';

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

export const useGlobalSearch = () => useContext(SearchContext) ?? raise(new Error('Missing SearchContext.'));

export const useGlobalSearchResults = <T extends Record<string, any>>(objects?: T[]): SearchResult[] => {
  const { match } = useGlobalSearch();
  return objects && match ? filterObjectsSync(objects, match) : [];
};

export const useGlobalFilteredObjects = <T extends Record<string, any>>(objects?: T[]): T[] => {
  const { match } = useGlobalSearch();
  if (!match || !objects) {
    return objects ?? [];
  }

  return useMemo(() => filterObjectsSync(objects, match).map((result) => result.object), [objects, match]);
};

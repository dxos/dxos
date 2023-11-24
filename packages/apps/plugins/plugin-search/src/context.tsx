//
// Copyright 2023 DXOS.org
//

import React, { createContext, type PropsWithChildren, useContext, useState } from 'react';

import { raise } from '@dxos/debug';

import { filterObjects, type SearchResult } from './search';

type SearchContextType = {
  match?: RegExp;
  setMatch?: (text?: string) => void;
};

const SearchContext = createContext<SearchContextType>({});

export const SearchContextProvider = ({ children }: PropsWithChildren) => {
  const [match, setMatch] = useState<RegExp>();
  const handleMatch = (text?: string) => {
    const trimmed = text?.trim();
    setMatch(trimmed ? new RegExp(trimmed, 'i') : undefined);
  };

  return <SearchContext.Provider value={{ match, setMatch: handleMatch }}>{children}</SearchContext.Provider>;
};

export const useSearch = () => {
  return useContext(SearchContext) ?? raise(new Error('Missing SearchContext.'));
};

export const useSearchResults = <T extends Record<string, any>>(objects?: T[]): SearchResult[] => {
  const { match } = useSearch();
  return objects && match ? filterObjects(objects, match) : [];
};

export const useFilteredObjects = <T extends Record<string, any>>(objects?: T[]): T[] => {
  const { match } = useSearch();
  if (!match || !objects) {
    return objects ?? [];
  }

  const matching = filterObjects(objects, match);
  return matching.map((result) => result.object);
};

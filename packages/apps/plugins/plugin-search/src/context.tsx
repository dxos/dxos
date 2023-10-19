//
// Copyright 2023 DXOS.org
//

import React, { createContext, type PropsWithChildren, useContext, useState } from 'react';

import { type TypedObject } from '@dxos/client/echo';
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
    setMatch(text?.length ? new RegExp(text, 'i') : undefined);
  };

  return <SearchContext.Provider value={{ match, setMatch: handleMatch }}>{children}</SearchContext.Provider>;
};

export const useSearch = () => {
  return useContext(SearchContext) ?? raise(new Error('Missing SearchContext.'));
};

export const useSearchResults = (objects?: TypedObject[]): SearchResult[] => {
  const { match } = useSearch();
  return objects && match ? filterObjects(objects, match) : [];
};

export const useFilteredObjects = (objects?: TypedObject[]): TypedObject[] => {
  const matching = useSearchResults(objects);
  return matching.map((result) => result.object);
};

//
// Copyright 2023 DXOS.org
//

import React, { createContext, type PropsWithChildren, useContext, useEffect, useState } from 'react';

import { raise } from '@dxos/debug';

import { filterObjects, filterObjectsSync, type SearchResult } from './search';

type SearchContextType = {
  match?: RegExp;
  setMatch?: (text?: string) => void;
};

const SearchContext = createContext<SearchContextType>({});

const queryStringToMatch = (queryString?: string): RegExp | undefined => {
  const trimmed = queryString?.trim();
  return trimmed ? new RegExp(trimmed, 'i') : undefined;
};

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

export const useSearchResults = <T extends Record<string, any>>(
  queryString?: string,
  objects?: T[],
  delay: number = 400,
): [boolean, Map<T, string[][]>] => {
  const [results, setResults] = useState<Map<T, string[][]>>(new Map());
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setPending(!!(objects && queryString));
    const timeoutId = setTimeout(async () => {
      const nextResults =
        objects && queryString ? await filterObjects(objects, queryStringToMatch(queryString)) : new Map();
      setResults(nextResults);
      setPending(false);
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [queryString, objects]);

  return [pending, results];
};

export const useGlobalFilteredObjects = <T extends Record<string, any>>(objects?: T[]): T[] => {
  const { match } = useGlobalSearch();
  if (!match || !objects) {
    return objects ?? [];
  }

  const matching = filterObjectsSync(objects, match);
  return matching.map((result) => result.object);
};

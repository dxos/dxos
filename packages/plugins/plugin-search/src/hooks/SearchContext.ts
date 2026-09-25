//
// Copyright 2024 DXOS.org
//

import { createContext, useContext } from 'react';

import { raise } from '@dxos/debug';
import { type Entity } from '@dxos/echo';
import { type SearchResult } from '@dxos/react-ui-search';

import { filterObjectsSync } from './sync.ts';

// Kept out of `useGlobalSearch.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a context and its hooks exported beside them force a full page reload on every edit.

export type SearchContextType = {
  match?: RegExp;
  setMatch?: (text?: string) => void;
};

export const SearchContext = createContext<SearchContextType>({});

export const useGlobalSearch = () => {
  return useContext(SearchContext) ?? raise(new Error('Missing SearchContext.'));
};

export const useGlobalSearchResults = <T extends Entity.Unknown>(objects?: T[]): SearchResult<T>[] => {
  const { match } = useGlobalSearch();
  return objects && match ? filterObjectsSync(objects, match) : [];
};

//
// Copyright 2023 DXOS.org
//

import React, { createContext, type PropsWithChildren, useContext, useState } from 'react';

import type { GraphProvides } from '@braneframe/plugin-graph';
import type { IntentProvides } from '@braneframe/plugin-intent';
import type { TranslationsProvides } from '@braneframe/plugin-theme';
import { type TypedObject, Text } from '@dxos/client/echo';
import { raise } from '@dxos/debug';

import type { SearchResult } from './components/SearchResults';

export const SEARCH_PLUGIN = 'dxos.org/plugin/search';

const SEARCH_ACTION = `${SEARCH_PLUGIN}/action`;

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

// TODO(burdon): EchoObject vs TypedObject?
// TODO(burdon): Create in-memory index.
const matcher = (object: SearchResult, match: RegExp) => {
  return object.label?.match(match);
};

const transformer = (object: TypedObject): SearchResult => {
  const label = String((object as any).label ?? (object as any).title ?? (object as any).name ?? '');
  let snippet = label;

  // TODO(burdon): Match document.
  if ((object as any).content instanceof Text) {
    snippet = String((object as any).content);
  }

  return { id: object.id, label, snippet };
};

export const useSearchResults = (objects?: TypedObject[]): SearchResult[] => {
  const { match } = useSearch();
  return objects?.map<SearchResult>(transformer).filter((object) => match && matcher(object, match)) ?? [];
};

export const useFilteredObjects = (objects?: TypedObject[]): TypedObject[] => {
  const { match } = useSearch();
  return (
    objects?.filter((object) => {
      if (!match) {
        return true;
      }

      return matcher(transformer(object), match);
    }) ?? []
  );
};

export enum SearchAction {
  SEARCH = `${SEARCH_ACTION}/search`,
}

export type SearchPluginProvides = GraphProvides & IntentProvides & TranslationsProvides;

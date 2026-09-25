//
// Copyright 2023 DXOS.org
//

import React, { type PropsWithChildren, useCallback, useState } from 'react';

import { type Entity } from '@dxos/echo';
import { GlobalFilterProvider } from '@dxos/react-ui-search';

import { SearchContext } from './SearchContext.ts';
import { filterObjectsSync, queryStringToMatch } from './sync.ts';

/**
 * Provider for global search context.
 * Also provides the GlobalFilterProvider for useGlobalFilteredObjects to work.
 */
export const SearchContextProvider = ({ children }: PropsWithChildren) => {
  const [match, setMatch] = useState<RegExp>();
  const handleMatch = (text?: string) => setMatch(queryStringToMatch(text));

  // Provide a filter function for useGlobalFilteredObjects.
  const filterFn = useCallback(
    <T extends Entity.Any>(objects: T[]): T[] => {
      if (!match) {
        return objects;
      }

      return filterObjectsSync(objects, match)
        .filter((result) => result.object)
        .map((result) => result.object!);
    },
    [match],
  );

  return (
    <SearchContext.Provider value={{ match, setMatch: handleMatch }}>
      <GlobalFilterProvider filter={filterFn}>{children}</GlobalFilterProvider>
    </SearchContext.Provider>
  );
};

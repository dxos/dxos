//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import * as TypeOptions from '@dxos/app-toolkit/TypeOptions';
import { Type } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { type URI } from '@dxos/keys';
import { type Space } from '@dxos/react-client/echo';

/**
 * Type URIs of the user-facing types in the space — the set the nav tree's Database section
 * lists, plus collections — used to scope full-text search to objects the app renders. Returns
 * an empty list until the types query resolves, which `buildSearchQuery` treats as match-nothing
 * rather than falling back to an unscoped search.
 */
export const useSearchableTypeUris = (space?: Space): URI.URI[] => {
  const types = useQuery(space?.db, TypeOptions.allTypesQuery);
  return useMemo(() => {
    const uris = new Set<URI.URI>();
    for (const type of types) {
      if (TypeOptions.isUserType(type)) {
        uris.add(Type.getURI(type));
      }
    }
    return [...uris];
  }, [types]);
};

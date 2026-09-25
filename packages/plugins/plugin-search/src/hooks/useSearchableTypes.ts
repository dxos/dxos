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
 * Type URIs of the space's user-facing types, for scoping search to objects the app renders.
 * Empty until the types query resolves — `buildSearchQuery` treats that as match-nothing rather
 * than falling back to an unscoped search.
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

//
// Copyright 2025 DXOS.org
//

import { useCallback } from 'react';

import { getDXN, type TypeAnnotation } from '@dxos/echo-schema';
import { Filter, type Space } from '@dxos/react-client/echo';
import { isNonNullable } from '@dxos/util';

type UseRefQueryLookupProps = {
  space?: Space;
};

export const useRefQueryLookupHandler = ({ space }: UseRefQueryLookupProps) => {
  const handleRefQueryLookup = useCallback(
    async (typeInfo: TypeAnnotation) => {
      if (!space) {
        return [];
      }
      const query = space.db.query(Filter.typename(typeInfo.typename));
      const results = query.runSync();

      return results
        .map((result) => {
          const dxn = getDXN(result.object);
          if (!dxn) {
            return undefined;
          }

          // TODO(Zaymon): Better fallback object names?
          const item = { dxn, label: result?.object?.name ?? result?.object?.id ?? '' };
          return item;
        })
        .filter(isNonNullable);
    },
    [space],
  );

  return handleRefQueryLookup;
};

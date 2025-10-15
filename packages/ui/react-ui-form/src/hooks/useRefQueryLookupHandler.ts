//
// Copyright 2025 DXOS.org
//

import { useCallback } from 'react';

import { type TypeAnnotation, getObjectDXN } from '@dxos/echo/internal';
import { Filter, type Space } from '@dxos/react-client/echo';
import { isNonNullable } from '@dxos/util';

import { type QueryRefOptions } from './useQueryRefOptions';

type UseRefQueryLookupProps = { space?: Space };

export const useRefQueryLookupHandler = ({ space }: UseRefQueryLookupProps): QueryRefOptions => {
  return useCallback(
    async (typeInfo: TypeAnnotation) => {
      if (!space) {
        return [];
      }
      const query = space.db.query(Filter.typename(typeInfo.typename));
      const { objects } = await query.run();

      return objects
        .map((object) => {
          const dxn = getObjectDXN(object);
          if (!dxn) {
            return undefined;
          }

          // TODO(Zaymon): Better fallback object names?
          const item = { dxn, label: object?.name ?? object?.id ?? '' };
          return item;
        })
        .filter(isNonNullable);
    },
    [space],
  );
};

//
// Copyright 2025 DXOS.org
//

import { useCallback } from 'react';

import { Obj } from '@dxos/echo';
import { type TypeAnnotation, getObjectDXN } from '@dxos/echo-schema';
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

          const item = { dxn, label: Obj.getLabel(object) ?? object?.id ?? '' };
          return item;
        })
        .filter(isNonNullable);
    },
    [space],
  );
};

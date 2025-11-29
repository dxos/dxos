//
// Copyright 2025 DXOS.org
//

import { useCallback } from 'react';

import { Obj } from '@dxos/echo';
import { type TypeAnnotation } from '@dxos/echo/internal';
import { Filter, type Space } from '@dxos/react-client/echo';
import { isNonNullable } from '@dxos/util';

import { type QueryRefOptions } from './useQueryRefOptions';

type UseRefQueryOptionsProps = { space?: Space };

export const useRefQueryOptions = ({ space }: UseRefQueryOptionsProps): QueryRefOptions => {
  return useCallback(
    async (typeInfo: TypeAnnotation) => {
      if (!space) {
        return [];
      }

      const query = space.db.query(Filter.typename(typeInfo.typename));
      const { objects } = await query.run();
      return objects
        .map((object) => {
          const dxn = Obj.getDXN(object);
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

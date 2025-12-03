//
// Copyright 2025 DXOS.org
//

import { useCallback } from 'react';

import { Obj } from '@dxos/echo';
import { Filter, type Space } from '@dxos/react-client/echo';
import { isNonNullable } from '@dxos/util';

import { type QueryRefOptions } from './useQueryRefOptions';

type UseRefQueryOptionsProps = { space?: Space };

export const useRefQueryOptions = ({ space }: UseRefQueryOptionsProps): QueryRefOptions => {
  return useCallback<QueryRefOptions>(
    async ({ typename }) => {
      if (!space) {
        return [];
      }

      const query = space.db.query(Filter.typename(typename));
      const objects = await query.run();
      return objects
        .map((object) => {
          const dxn = Obj.getDXN(object);
          if (!dxn) {
            return undefined;
          }

          return { dxn, label: Obj.getLabel(object) ?? object?.id ?? '' };
        })
        .filter(isNonNullable);
    },
    [space],
  );
};

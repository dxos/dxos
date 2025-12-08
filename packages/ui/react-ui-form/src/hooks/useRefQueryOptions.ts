//
// Copyright 2025 DXOS.org
//

import { useCallback } from 'react';

import { type Database, Obj } from '@dxos/echo';
import { Filter } from '@dxos/react-client/echo';
import { isNonNullable } from '@dxos/util';

import { type QueryRefOptions } from './useQueryRefOptions';

type UseRefQueryOptionsProps = { db?: Database.Database };

export const useRefQueryOptions = ({ db }: UseRefQueryOptionsProps): QueryRefOptions => {
  return useCallback<QueryRefOptions>(
    async ({ typename }) => {
      if (!db) {
        return [];
      }

      const query = db.query(Filter.typename(typename));
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
    [db],
  );
};

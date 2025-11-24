//
// Copyright 2025 DXOS.org
//

import { useCallback } from 'react';

import { type Annotation, Filter, Obj } from '@dxos/echo';
import { type Space } from '@dxos/react-client/echo';
import { isNonNullable } from '@dxos/util';

import { type QueryRefOptions } from './useQueryRefOptions';

type UseRefQueryLookupProps = { space?: Space };

export const useRefQueryLookupHandler = ({ space }: UseRefQueryLookupProps): QueryRefOptions => {
  return useCallback(
    async (typeInfo: Annotation.TypeAnnotation) => {
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

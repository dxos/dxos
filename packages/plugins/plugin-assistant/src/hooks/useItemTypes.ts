//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';
import { useEffect, useState } from 'react';

import { type Type } from '@dxos/echo';
import { type Space } from '@dxos/react-client/echo';
import { ItemAnnotation } from '@dxos/schema';

// TODO(burdon): Pass in filter.
export const useItemTypes = (space?: Space): Type.Obj.Any[] => {
  const [types, setTypes] = useState<Type.Obj.Any[]>([]);
  useEffect(() => {
    if (!space) {
      return;
    }

    return space.db.schemaRegistry.query().subscribe(
      (query) => {
        const types = Array.from(
          new Set(
            [...space.db.graph.schemaRegistry.schemas, ...query.results].filter((type) =>
              Option.isSome(ItemAnnotation.get(type)),
            ),
          ),
        );

        setTypes(types);
      },
      { fire: true },
    );
  }, [space]);

  return types;
};

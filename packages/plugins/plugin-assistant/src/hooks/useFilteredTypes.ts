//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';
import { useEffect, useState } from 'react';

import { type Type } from '@dxos/echo';
import { EntityKind, SystemTypeAnnotation, getTypeAnnotation } from '@dxos/echo/internal';
import { type Space } from '@dxos/react-client/echo';

// TODO(burdon): Pass in filter.
// TODO(wittjosiah): Factor out.
export const useFilteredTypes = (space?: Space): Type.Obj.Any[] => {
  const [types, setTypes] = useState<Type.Obj.Any[]>([]);
  useEffect(() => {
    if (!space) {
      return;
    }

    return space.db.schemaRegistry.query().subscribe(
      (query) => {
        const types = Array.from(
          new Set(
            [...space.db.graph.schemaRegistry.schemas, ...query.results]
              .filter((schema) => getTypeAnnotation(schema)?.kind !== EntityKind.Relation)
              .filter((schema) => SystemTypeAnnotation.get(schema).pipe(Option.getOrElse(() => false))),
          ),
        );

        setTypes(types);
      },
      { fire: true },
    );
  }, [space]);

  return types;
};

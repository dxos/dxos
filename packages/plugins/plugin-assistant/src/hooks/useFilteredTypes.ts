//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';
import { useEffect, useState } from 'react';

import { type Database, type Type } from '@dxos/echo';
import { EntityKind, SystemTypeAnnotation, getTypeAnnotation } from '@dxos/echo/internal';

// TODO(burdon): Pass in filter.
// TODO(wittjosiah): Factor out.
export const useFilteredTypes = (db?: Database.Database): Type.Entity.Any[] => {
  const [types, setTypes] = useState<Type.Entity.Any[]>([]);
  useEffect(() => {
    if (!db) {
      return;
    }

    return db.schemaRegistry.query({ location: ['database', 'runtime'] }).subscribe(
      (query) => {
        const types = Array.from(
          new Set(
            query.results
              .filter((schema) => getTypeAnnotation(schema)?.kind !== EntityKind.Relation)
              .filter((schema) => SystemTypeAnnotation.get(schema).pipe(Option.getOrElse(() => false))),
          ),
        );

        setTypes(types);
      },
      { fire: true },
    );
  }, [db]);

  return types;
};

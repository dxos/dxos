//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';
import { useEffect, useState } from 'react';

import { type Database, Type } from '@dxos/echo';
import { EntityKind, SystemTypeAnnotation, getTypeAnnotation } from '@dxos/echo/internal';

// TODO(burdon): Pass in filter.
// TODO(wittjosiah): Factor out.
export const useFilteredTypes = (db?: Database.Database): Type.AnyEntity[] => {
  const [types, setTypes] = useState<Type.AnyEntity[]>([]);
  useEffect(() => {
    if (!db) {
      return;
    }

    return db.schemaRegistry.query({ location: ['database', 'runtime'] }).subscribe(
      (query) => {
        const types = Array.from(
          new Set(
            query.results
              .filter((type) => getTypeAnnotation(Type.getSchema(type))?.kind !== EntityKind.Relation)
              .filter((type) => !SystemTypeAnnotation.get(Type.getSchema(type)).pipe(Option.getOrElse(() => false))),
          ),
        );

        setTypes(types);
      },
      { fire: true },
    );
  }, [db]);

  return types;
};

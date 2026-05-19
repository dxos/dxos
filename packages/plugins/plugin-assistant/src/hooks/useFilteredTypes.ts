//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';
import { useEffect, useState } from 'react';

import { type Database, type Type } from '@dxos/echo';
import { EntityKind, SystemTypeAnnotation, getTypeAnnotation } from '@dxos/echo/internal';

const getFilteredTypes = (db: Database.Database): Type.AnyEntity[] =>
  Array.from(
    new Set(
      db.graph.registry.listTypes()
        .filter((schema) => getTypeAnnotation(schema)?.kind !== EntityKind.Relation)
        .filter((schema) => !SystemTypeAnnotation.get(schema).pipe(Option.getOrElse(() => false))),
    ),
  );

// TODO(burdon): Pass in filter.
// TODO(wittjosiah): Factor out.
export const useFilteredTypes = (db?: Database.Database): Type.AnyEntity[] => {
  const [types, setTypes] = useState<Type.AnyEntity[]>([]);
  useEffect(() => {
    if (!db) {
      return;
    }

    setTypes(getFilteredTypes(db));
    return db.graph.registry.changed.on(() => {
      setTypes(getFilteredTypes(db));
    });
  }, [db]);

  return types;
};

//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';
import { useEffect, useState } from 'react';

import { type Database, Type } from '@dxos/echo';
import * as Annotation from '@dxos/echo/Annotation';
import * as Entity from '@dxos/echo/Entity';

const getFilteredTypes = (db: Database.Database): Type.AnyEntity[] =>
  Array.from(
    new Set(
      db.graph.registry
        .list()
        .filter(Type.isType)
        .filter((schema) => Annotation.getTypeAnnotation(Type.getSchema(schema))?.kind !== Entity.Kind.Relation)
        .filter(
          (schema) => !Annotation.HiddenAnnotation.get(Type.getSchema(schema)).pipe(Option.getOrElse(() => false)),
        ),
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

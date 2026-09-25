//
// Copyright 2025 DXOS.org
//

import { useEffect, useState } from 'react';

import * as TypeOptions from '@dxos/app-toolkit/TypeOptions';
import { type Database, Type } from '@dxos/echo';

const getFilteredTypes = (db: Database.Database): Type.AnyEntity[] =>
  Array.from(
    new Set(
      db.graph.registry
        .list()
        .filter(Type.isType)
        .filter((schema) => TypeOptions.isUserType(schema)),
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

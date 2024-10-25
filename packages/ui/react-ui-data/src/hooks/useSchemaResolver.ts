//
// Copyright 2024 DXOS.org
//

import { useMemo } from 'react';

import { MutableSchemaRegistry } from '@dxos/echo-db';
import { type SchemaResolver } from '@dxos/echo-schema';
import { useSpace } from '@dxos/react-client/echo';

export const useSchemaResolver = () => {
  const space = useSpace();
  return useMemo<SchemaResolver | undefined>(() => {
    if (space) {
      const registry = new MutableSchemaRegistry(space.db);
      return (typename: string) => registry.getSchemaByTypename(typename);
    }
  }, [space]);
};

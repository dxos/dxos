//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import * as TypeOptions from '@dxos/app-toolkit/TypeOptions';
import { type Database, Type } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';

/**
 * Names of the single-select properties of the type with the given URI, which can pivot a kanban.
 */
export const useSingleSelectFields = (db: Database.Database | undefined, typeUri: string | undefined): string[] => {
  const types = useQuery(db, TypeOptions.allTypesQuery);
  return useMemo(() => {
    const type = types.filter(Type.isType).find((type) => Type.getURI(type) === typeUri);
    const properties = type?.jsonSchema.properties;
    if (!properties) {
      return [];
    }

    return Object.entries(properties).reduce<string[]>((acc, [key, value]) => {
      if (typeof value === 'object' && value !== null && (value as { format?: string }).format === 'single-select') {
        acc.push(key);
      }
      return acc;
    }, []);
  }, [types, typeUri]);
};

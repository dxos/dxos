//
// Copyright 2025 DXOS.org
//

import { useCallback } from 'react';

import { type Database, Obj, Type } from '@dxos/echo';

import { type InsertRowResult } from '../model';

export type UseAddRowProps = {
  db?: Database.Database;
  schema?: Type.AnyObjectType | Type.Type;
};

/**
 * Hook that provides a safe row creation function that handles schema validation failures.
 * Returns a callback that attempts to create an object and returns boolean success/failure.
 * Can accept optional data to create objects with specific content (used for committing draft rows).
 */
export const useAddRow = ({ db, schema }: UseAddRowProps) => {
  return useCallback(
    (data?: any): InsertRowResult => {
      if (db && schema) {
        try {
          const obj = Type.isType(schema)
            ? Obj.make(schema as unknown as Type.AnyObjectType, data ?? {})
            : Obj.make(schema, data ?? {});
          db.add(obj);
          return 'final';
        } catch (error) {
          return 'draft';
        }
      }
      return 'final';
    },
    [db, schema],
  );
};

//
// Copyright 2025 DXOS.org
//

import type * as Schema from 'effect/Schema';
import { useCallback } from 'react';

import { type Database, Obj } from '@dxos/echo';

import { type InsertRowResult } from '../model';

export type UseAddRowParams = {
  db?: Database.Database;
  schema?: Schema.Schema.AnyNoContext;
};

/**
 * Hook that provides a safe row creation function that handles schema validation failures.
 * Returns a callback that attempts to create an object and returns boolean success/failure.
 * Can accept optional data to create objects with specific content (used for committing draft rows).
 */
export const useAddRow = ({ db, schema }: UseAddRowParams) => {
  return useCallback(
    (data?: any): InsertRowResult => {
      if (db && schema) {
        try {
          db.add(Obj.make(schema, data ?? {}));
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

//
// Copyright 2025 DXOS.org
//

import { type Schema } from 'effect';
import { useCallback } from 'react';

import { type Space } from '@dxos/client/echo';
import { Obj } from '@dxos/echo';

export type UseAddRowParams = {
  space?: Space;
  schema?: Schema.Schema.AnyNoContext;
};

/**
 * Hook that provides a safe row creation function that handles schema validation failures.
 * Returns a callback that attempts to create an object and returns boolean success/failure.
 */
export const useAddRow = ({ space, schema }: UseAddRowParams) => {
  return useCallback(() => {
    if (space && schema) {
      try {
        space.db.add(Obj.make(schema, {}));
        return true;
      } catch (error) {
        return false;
      }
    }
    return false;
  }, [space, schema]);
};

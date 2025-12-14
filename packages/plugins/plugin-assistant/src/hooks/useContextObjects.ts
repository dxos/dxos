//
// Copyright 2025 DXOS.org
//

import { useCallback } from 'react';

import { type AiContextBinder } from '@dxos/assistant';
import { type DXN, type Database, type Obj, Ref } from '@dxos/echo';

export type UseContextObjects = {
  objects: Obj.Any[];
  onUpdateObject: (dxn: DXN, checked: boolean) => Promise<void>;
};

/**
 * Create reactive map of active object references (by DXN string).
 */
export const useContextObjects = ({
  db,
  context,
}: {
  db?: Database.Database;
  context?: AiContextBinder;
}): UseContextObjects => {
  const handleUpdateObject = useCallback<UseContextObjects['onUpdateObject']>(
    async (dxn: DXN, checked: boolean) => {
      if (!db || !context) {
        return;
      }

      const ref = Ref.fromDXN(dxn);
      // Load the object by DXN from the current space.
      await ref.load();

      if (checked) {
        await context.bind({ objects: [ref] });
      } else {
        await context.unbind({ objects: [ref] });
      }
    },
    [db, context],
  );

  return {
    objects: context?.objects.value ?? [],
    onUpdateObject: handleUpdateObject,
  };
};

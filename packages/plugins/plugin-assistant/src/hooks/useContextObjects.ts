//
// Copyright 2025 DXOS.org
//

import { useCallback } from 'react';

import { type AiContextBinder } from '@dxos/assistant';
import { type DXN, type Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { type Space } from '@dxos/react-client/echo';
import { isNonNullable } from '@dxos/util';

export type UseContextObjects = {
  objects: Obj.Any[];
  onUpdateObject: (dxn: DXN, checked: boolean) => Promise<void>;
};

/**
 * Create reactive map of active object references (by DXN string).
 */
export const useContextObjects = ({
  space,
  context,
}: {
  space?: Space;
  context?: AiContextBinder;
}): UseContextObjects => {
  const objects = context?.objects.value.map((ref) => ref.target).filter(isNonNullable) ?? [];

  const handleUpdateObject = useCallback<UseContextObjects['onUpdateObject']>(
    async (dxn: DXN, checked: boolean) => {
      if (!space || !context) {
        return;
      }

      // Load the object by DXN/id from the current space.
      const id = dxn.asEchoDXN();
      const object = id && space.db.getObjectById(id.echoId);
      if (!object) {
        log.warn('Object not found', { dxn, id });
        return;
      }

      const ref = Ref.fromDXN(dxn);
      if (checked) {
        await context.bind({ objects: [ref] });
      } else {
        await context.unbind({ objects: [ref] });
      }
    },
    [space, context],
  );

  return {
    objects,
    onUpdateObject: handleUpdateObject,
  };
};

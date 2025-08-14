//
// Copyright 2025 DXOS.org
//

import { useSignalEffect } from '@preact/signals-react';
import { useCallback, useState } from 'react';

import { type AiContextBinder } from '@dxos/assistant';
import { type Space } from '@dxos/client/echo';
import { DXN, Obj, Ref } from '@dxos/echo';
import { isNonNullable } from '@dxos/util';

/**
 * Create reactive map of active object references (by DXN string).
 */
export const useActiveReferences = ({ context }: { context?: AiContextBinder }) => {
  const [active, setActive] = useState<Map<string, Obj.Any>>(new Map());

  useSignalEffect(() => {
    const refs = [...(context?.objects.value ?? [])];
    const t = setTimeout(async () => {
      const objects = (await Ref.Array.loadAll(refs)).filter(isNonNullable);
      setActive(new Map(objects.map((object) => [Obj.getDXN(object as any).toString(), object])));
    });

    return () => clearTimeout(t);
  });

  return active;
};

/**
 * Handlers to bind/unbind object references to the AI context via context.objects.
 */
export const useReferencesHandlers = ({ space, context }: { space: Space; context?: AiContextBinder }) => {
  const onUpdateReference = useCallback(
    async (dxn: string, checked: boolean) => {
      if (!context) {
        return;
      }
      const parsedDxn = DXN.parse(dxn);
      // Load the object by DXN/id from the current space.
      const object = await space.db.getObjectById(parsedDxn.parts[1]);
      if (!object) {
        return;
      }

      const ref = Ref.fromDXN(parsedDxn);
      if (checked) {
        await context.bind({ objects: [ref] });
      } else {
        await context.unbind({ objects: [ref] });
      }
    },
    [space, context],
  );

  return { onUpdateReference };
};

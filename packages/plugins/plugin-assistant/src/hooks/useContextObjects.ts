//
// Copyright 2025 DXOS.org
//

import { Atom, useAtomValue } from '@effect-atom/atom-react';
import { useCallback } from 'react';

import { type AiContext } from '@dxos/assistant';
import { type Database, type Obj } from '@dxos/echo';
import { type URI } from '@dxos/keys';

export type UseContextObjectsProps = {
  db?: Database.Database;
  context?: AiContext.Binder;
};

export type UseContextObjects = {
  objects: Obj.Unknown[];
  onUpdateObject: (dxn: URI.URI, checked: boolean) => Promise<void>;
};

const emptyObjectsAtom = Atom.make<Obj.Unknown[]>([]);

/**
 * Create reactive map of active object references (by DXN string).
 */
export const useContextObjects = ({ db, context }: UseContextObjectsProps): UseContextObjects => {
  const objects = useAtomValue(context?.objects ?? emptyObjectsAtom);

  const handleUpdateObject = useCallback<UseContextObjects['onUpdateObject']>(
    async (dxn: URI.URI, checked: boolean) => {
      if (!db || !context) {
        return;
      }

      const ref = db.makeRef<Obj.Unknown>(dxn);
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
    objects,
    onUpdateObject: handleUpdateObject,
  };
};

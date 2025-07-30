//
// Copyright 2025 DXOS.org
//

import { effect } from '@preact/signals-react';
import { useCallback, useEffect, useState } from 'react';

import { type ContextBinder } from '@dxos/assistant';
import { Blueprint } from '@dxos/blueprints';
import { type Space } from '@dxos/client/echo';
import { Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { isNonNullable } from '@dxos/util';

export type UpdateCallback = (key: string, active: boolean) => void;

/**
 * Get collection of active blueprints based on the context.
 */
export const useBlueprints = (
  space: Space,
  context: ContextBinder,
  blueprintRegistry?: Blueprint.Registry,
): [Blueprint.Blueprint[], UpdateCallback] => {
  const [blueprints, setBlueprints] = useState<Blueprint.Blueprint[]>([]);
  useEffect(() => {
    let t: NodeJS.Timeout;
    effect(() => {
      const refs = [...(context.blueprints.value ?? [])];
      t = setTimeout(async () => {
        const blueprints = (await Ref.Array.loadAll(refs)).filter(isNonNullable);
        setBlueprints(blueprints);
      });
    });

    return () => clearTimeout(t);
  }, [context]);

  const handleUpdate = useCallback<UpdateCallback>(
    (key: string, active: boolean) => {
      log.info('update', { key, active });
      if (active) {
        // TODO(burdon): Check if already in space.
        const blueprint = blueprintRegistry?.getByKey(key);
        if (blueprint) {
          // TODO(dmaretskyi): This should be done by Obj.clone.
          const { id: _id, ...data } = blueprint;
          const obj = space.db.add(Obj.make(Blueprint.Blueprint, data));
          void context.bind({ blueprints: [Ref.make(obj)] });
        }
      }
    },
    [space, context],
  );

  return [blueprints, handleUpdate] as const;
};

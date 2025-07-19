//
// Copyright 2025 DXOS.org
//

import { useCallback, useState } from 'react';

import { type Blueprint, type ContextBinder } from '@dxos/assistant';
import { Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { useTimeout } from '@dxos/react-ui';
import { isNonNullable } from '@dxos/util';

export type UpdateCallback = (key: string, active: boolean) => void;

export const useBlueprints = (context: ContextBinder): [Blueprint[], UpdateCallback] => {
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  useTimeout(
    async () => {
      const blueprints = (await Ref.Array.loadAll(context.blueprints.value ?? [])).filter(isNonNullable);
      setBlueprints(blueprints);
    },
    0,
    [context],
  );

  const handleUpdate = useCallback<UpdateCallback>((key: string, active: boolean) => {
    log.info('update', { key, active });
  }, []);

  return [blueprints, handleUpdate] as const;
};

//
// Copyright 2023 DXOS.org
//

import { useState } from 'react';

import { createDocAccessor } from '@dxos/echo-db';
import { log } from '@dxos/log';
import { useAsyncEffect } from '@dxos/react-ui';

import { Diagram } from '../types';

import { TLDrawStoreAdapter } from './adapter';

export const useStoreAdapter = (object?: Diagram.Diagram) => {
  const [adapter] = useState(new TLDrawStoreAdapter());
  const [_, forceUpdate] = useState({});
  useAsyncEffect(async () => {
    if (!object) {
      return;
    }

    const canvas = await object.canvas.load();

    if (canvas.schema !== Diagram.TLDRAW_SCHEMA) {
      log.warn('invalid schema', { schema: canvas.schema });
      return;
    }

    const accessor = createDocAccessor(canvas, ['content']);
    await adapter.open(accessor);
    forceUpdate({});

    return () => {
      void adapter.close();
    };
  }, [object]);

  return adapter;
};

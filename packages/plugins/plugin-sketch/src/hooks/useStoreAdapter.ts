//
// Copyright 2023 DXOS.org
//

import { useState } from 'react';

import { createDocAccessor } from '@dxos/echo-db';
import { log } from '@dxos/log';
import { useAsyncEffect } from '@dxos/react-ui';

import { Diagram } from '../types';

import { TLDrawStoreAdapter } from './adapter';

/**
 * Hook that manages the TLDraw store adapter lifecycle for a diagram object.
 * Loads the canvas ref, creates a doc accessor, and opens the adapter.
 *
 * @param object - Optional diagram whose canvas will be loaded and synced.
 * @returns The TLDrawStoreAdapter instance managing the tldraw store.
 */
export const useStoreAdapter = (object?: Diagram.Diagram) => {
  const [adapter] = useState(new TLDrawStoreAdapter());
  const [_, forceUpdate] = useState({});
  useAsyncEffect(async (controller) => {
    if (!object) {
      return;
    }

    const canvas = await object.canvas.load();
    if (controller.signal.aborted) {
      return;
    }

    if (canvas.schema !== Diagram.TLDRAW_SCHEMA) {
      log.warn('invalid schema', { schema: canvas.schema });
      return;
    }

    const accessor = createDocAccessor(canvas, ['content']);
    await adapter.open(accessor);
    if (controller.signal.aborted) {
      void adapter.close();
      return;
    }

    forceUpdate({});

    return () => {
      void adapter.close();
    };
  }, [object]);

  return adapter;
};

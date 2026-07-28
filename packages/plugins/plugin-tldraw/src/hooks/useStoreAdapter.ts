//
// Copyright 2023 DXOS.org
//

import { useState } from 'react';

import { Doc } from '@dxos/echo-doc';
import { log } from '@dxos/log';
import { useAsyncEffect } from '@dxos/react-ui';

import { Tldraw } from '#types';

import { TLDrawStoreAdapter } from './adapter';

/**
 * Hook that manages the TLDraw store adapter lifecycle for a canvas object.
 * Creates a doc accessor and opens the adapter.
 *
 * @param canvas - Optional canvas whose content will be synced.
 * @returns The TLDrawStoreAdapter instance managing the tldraw store.
 */
export const useStoreAdapter = (canvas?: Tldraw.Canvas) => {
  const [adapter] = useState(new TLDrawStoreAdapter());
  const [_, forceUpdate] = useState({});
  useAsyncEffect(
    async (controller) => {
      if (!canvas) {
        return;
      }

      if (canvas.schema !== Tldraw.TLDRAW_SCHEMA) {
        log.warn('invalid schema', { schema: canvas.schema });
        return;
      }

      const accessor = Doc.createAccessor(canvas, ['content']);
      await adapter.open(accessor);
      if (controller.signal.aborted) {
        void adapter.close();
        return;
      }

      forceUpdate({});

      return () => {
        void adapter.close();
      };
    },
    [canvas],
  );

  return adapter;
};

//
// Copyright 2024 DXOS.org
//

import { useState } from 'react';

import { Doc } from '@dxos/echo-doc';
import { log } from '@dxos/log';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import { useAsyncEffect } from '@dxos/react-ui';

import { Excalidraw } from '#types';

import { ExcalidrawStoreAdapter, type ExcalidrawStoreAdapterProps } from './adapter.ts';

/**
 * Hook that manages the Excalidraw store adapter lifecycle for a canvas object.
 * Creates a doc accessor and opens the adapter.
 *
 * @param canvas - Optional canvas whose content will be synced.
 * @param options - Adapter callbacks, notably `onUpdate` for scene changes.
 * @returns The ExcalidrawStoreAdapter instance managing the scene elements.
 */
export const useStoreAdapter = (canvas?: Drawing.Canvas, options: ExcalidrawStoreAdapterProps = {}) => {
  // Lazy initializer: the article re-renders on every pointer down/up, and the eager form would
  // construct (and discard) an adapter each time.
  const [adapter] = useState(() => new ExcalidrawStoreAdapter(options));
  const [, forceUpdate] = useState({});

  useAsyncEffect(
    async (controller) => {
      if (!canvas) {
        return;
      }

      if (canvas.schema !== Excalidraw.EXCALIDRAW_SCHEMA) {
        log.warn('invalid schema', { schema: canvas.schema });
        return;
      }

      const accessor = Doc.createAccessor(canvas, ['content']);
      adapter.open(accessor);
      if (controller.signal.aborted) {
        adapter.close();
        return;
      }

      forceUpdate({});

      return () => {
        adapter.close();
      };
    },
    [canvas],
  );

  return adapter;
};

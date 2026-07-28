//
// Copyright 2024 DXOS.org
//

import { useState } from 'react';

import { Doc } from '@dxos/echo-doc';
import { useObject } from '@dxos/echo-react';
import { log } from '@dxos/log';
import { useAsyncEffect } from '@dxos/react-ui';

import { Excalidraw } from '#types';

import { ExcalidrawStoreAdapter, type ExcalidrawStoreAdapterProps } from './adapter';

/**
 * Hook that manages the Excalidraw store adapter lifecycle for a canvas object.
 * Loads the canvas ref, creates a doc accessor, and opens the adapter.
 *
 * @param object - Optional object whose canvas will be loaded and synced.
 * @param options - Adapter callbacks, notably `onUpdate` for scene changes.
 * @returns The ExcalidrawStoreAdapter instance managing the scene elements.
 */
export const useStoreAdapter = (object?: Excalidraw.Excalidraw, options: ExcalidrawStoreAdapterProps = {}) => {
  const [adapter] = useState(new ExcalidrawStoreAdapter(options));
  const [_, forceUpdate] = useState({});
  // Subscribe to the Ref so the effect below re-runs when the canvas resolves; the accessor
  // still needs the echo-attached object, so the effect goes through `ref.load()`.
  const [canvasSnapshot] = useObject(object?.canvas);

  useAsyncEffect(
    async (controller) => {
      if (!object || !canvasSnapshot) {
        return;
      }

      const canvas = await object.canvas.load();
      if (controller.signal.aborted) {
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
    [object, canvasSnapshot],
  );

  return adapter;
};

//
// Copyright 2024 DXOS.org
//

import { useEffect, useState } from 'react';

import { createDocAccessor } from '@dxos/echo-db';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type DiagramType } from '@dxos/plugin-sketch/types';

import { ExcalidrawStoreAdapter, type ExcalidrawStoreAdapterProps } from './adapter';
import { EXCALIDRAW_SCHEMA } from '../types';

export const useStoreAdapter = (object?: DiagramType, options: ExcalidrawStoreAdapterProps = {}) => {
  const [adapter] = useState(new ExcalidrawStoreAdapter(options));
  const [_, forceUpdate] = useState({});
  useEffect(() => {
    if (!object) {
      return;
    }

    if (object.canvas.target?.schema !== EXCALIDRAW_SCHEMA) {
      log.warn('invalid schema', { schema: object.canvas.target?.schema });
      return;
    }

    const t = setTimeout(async () => {
      invariant(object.canvas);
      const accessor = createDocAccessor(object.canvas.target!, ['content']);
      await adapter.open(accessor);
      forceUpdate({});
    });

    return () => {
      clearTimeout(t);
      void adapter.close();
    };
  }, [object]);

  return adapter;
};

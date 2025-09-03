//
// Copyright 2023 DXOS.org
//

import { useEffect, useState } from 'react';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { createDocAccessor } from '@dxos/react-client/echo';

import { type DiagramType, TLDRAW_SCHEMA } from '../types';

import { TLDrawStoreAdapter } from './adapter';

export const useStoreAdapter = (object?: DiagramType) => {
  const [adapter] = useState(new TLDrawStoreAdapter());
  const [_, forceUpdate] = useState({});
  useEffect(() => {
    if (!object || !object.canvas?.target) {
      return;
    }

    if (object.canvas?.target?.schema !== TLDRAW_SCHEMA) {
      log.warn('invalid schema', { schema: object.canvas.target?.schema });
      return;
    }

    const t = setTimeout(async () => {
      invariant(object.canvas.target);
      console.log(JSON.stringify(object.canvas.target, undefined, 2));
      const accessor = createDocAccessor(object.canvas.target, ['content']);
      await adapter.open(accessor);
      forceUpdate({});
    });

    return () => {
      clearTimeout(t);
      void adapter.close();
    };
  }, [object, object?.canvas.target]);

  return adapter;
};

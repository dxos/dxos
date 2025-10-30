//
// Copyright 2023 DXOS.org
//

import { useEffect, useState } from 'react';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { createDocAccessor } from '@dxos/react-client/echo';

import { Diagram } from '../types';

import { TLDrawStoreAdapter } from './adapter';

export const useStoreAdapter = (object?: Diagram.Diagram) => {
  const [adapter] = useState(new TLDrawStoreAdapter());
  const [_, forceUpdate] = useState({});
  useEffect(() => {
    if (!object || !object.canvas?.target) {
      return;
    }

    if (object.canvas?.target?.schema !== Diagram.TLDRAW_SCHEMA) {
      log.warn('invalid schema', { schema: object.canvas.target?.schema });
      return;
    }

    const t = setTimeout(async () => {
      invariant(object.canvas.target);
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

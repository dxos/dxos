//
// Copyright 2023 DXOS.org
//

import { useEffect, useState } from 'react';

import { type EchoReactiveObject } from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { createDocAccessor } from '@dxos/react-client/echo';

import { TLDrawStoreAdapter } from './adapter';
import { type DiagramType, TLDRAW_SCHEMA } from '../types';

export const useStoreAdapter = (object?: EchoReactiveObject<DiagramType>) => {
  const [adapter] = useState(new TLDrawStoreAdapter());
  const [_, forceUpdate] = useState({});
  useEffect(() => {
    if (!object) {
      return;
    }

    if (object.canvas?.schema !== TLDRAW_SCHEMA) {
      log.warn('invalid schema', { schema: object.canvas?.schema });
      return;
    }

    const t = setTimeout(async () => {
      console.log('useStoreAdapter', JSON.stringify(object.canvas, null, 2));
      await adapter.open(createDocAccessor(object, ['canvas', 'content']));
      forceUpdate({});
    });

    return () => {
      clearTimeout(t);
      void adapter.close();
    };
  }, [object]);

  return adapter;
};

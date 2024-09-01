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

    // TODO(burdon): Requires type migration (also for excalidraw).
    const t = setTimeout(async () => {
      console.log('A', JSON.stringify(object.canvas, null, 2));

      const accessor1 = createDocAccessor(object, ['canvas', 'content']);
      const content1 = accessor1.handle.docSync();
      console.log('B', accessor1.path, JSON.stringify(content1, null, 2));

      const accessor2 = createDocAccessor(object.canvas!, ['content']);
      const content2 = accessor1.handle.docSync();
      console.log('C', accessor2.path, JSON.stringify(content2, null, 2));

      await adapter.open(accessor1);
      forceUpdate({});
    });

    return () => {
      clearTimeout(t);
      void adapter.close();
    };
  }, [object]);

  return adapter;
};

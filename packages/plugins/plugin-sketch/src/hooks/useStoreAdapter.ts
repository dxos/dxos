//
// Copyright 2023 DXOS.org
//

import { useEffect, useState } from 'react';

import { type EchoReactiveObject } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
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
      invariant(object.canvas);
      const accessor = createDocAccessor(object.canvas, ['content']);
      // const content = accessor1.handle.docSync();
      // console.log('A', accessor.path, JSON.stringify(content, null, 2));

      // TODO(burdon): Requires type migration (also for excalidraw).
      // const accessor1 = createDocAccessor(object, ['canvas', 'content']);
      // const content1 = accessor1.handle.docSync();
      // console.log('B', accessor1.path, JSON.stringify(content1, null, 2));

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

//
// Copyright 2023 DXOS.org
//

import { useEffect, useState } from 'react';

import { type EchoReactiveObject } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { createDocAccessor } from '@dxos/react-client/echo';
import { setDeep } from '@dxos/util';

import { TLDrawStoreAdapter } from './adapter';
import { type DiagramType, TLDRAW_SCHEMA } from '../types';
import { getDeep } from '../util';

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

      try {
        // OTF migration from old path.
        const accessor = createDocAccessor(object, ['content']);
        const oldData = getDeep(accessor.handle.docSync(), accessor.path);
        if (Object.keys(oldData ?? {}).length) {
          object.canvas.content = oldData;
          accessor.handle.change((object) => setDeep(object, accessor.path, {}));
        }
      } catch (err) {
        log.catch(err);
      }

      const accessor = createDocAccessor(object.canvas, ['content']);
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

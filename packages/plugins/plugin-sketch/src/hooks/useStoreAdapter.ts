//
// Copyright 2023 DXOS.org
//

import { useEffect, useState } from 'react';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { createDocAccessor } from '@dxos/react-client/echo';
import { setDeep } from '@dxos/util';

import { TLDrawStoreAdapter } from './adapter';
import { type DiagramType, TLDRAW_SCHEMA } from '../types';
import { getDeep } from '../util';

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
      invariant(object.canvas);

      try {
        // OTF migration from old path.
        const accessor = createDocAccessor(object, ['content']);
        const oldData = getDeep(accessor.handle.doc(), accessor.path);
        if (Object.keys(oldData ?? {}).length) {
          object.canvas.target!.content = oldData;
          accessor.handle.change((object) => setDeep(object, accessor.path, {}));
        }
      } catch (err) {
        log.catch(err);
      }

      const accessor = createDocAccessor(object.canvas.target!, ['content']);
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

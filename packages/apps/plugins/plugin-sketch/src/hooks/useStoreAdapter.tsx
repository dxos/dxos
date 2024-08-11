//
// Copyright 2023 DXOS.org
//

import { useEffect, useState } from 'react';

import { type DiagramType, TLDRAW_SCHEMA } from '@braneframe/types';
import { type EchoReactiveObject } from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { createDocAccessor } from '@dxos/react-client/echo';

import { TLDrawStoreAdapter } from './adapter';

export const useStoreAdapter = (object?: EchoReactiveObject<DiagramType>) => {
  const [adapter] = useState(new TLDrawStoreAdapter());
  useEffect(() => {
    if (!object) {
      return;
    }

    if (object.canvas?.schema !== TLDRAW_SCHEMA) {
      log.warn('invalid schema', { schema: object.canvas?.schema });
      return;
    }

    void adapter.open(createDocAccessor(object, ['content']));
    return () => {
      void adapter.close();
    };
  }, [object]);

  return adapter;
};

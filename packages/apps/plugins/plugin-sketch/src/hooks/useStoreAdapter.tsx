//
// Copyright 2023 DXOS.org
//

import { useEffect, useState } from 'react';

import { type DiagramType, TLDRAW_SCHEMA } from '@braneframe/types';
import { type EchoReactiveObject } from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { createDocAccessor } from '@dxos/react-client/echo';

import { AutomergeStoreAdapter, type AutomergeStoreAdapterProps } from './adapter';

export const useStoreAdapter = (object?: EchoReactiveObject<DiagramType>, options: AutomergeStoreAdapterProps = {}) => {
  const [adapter] = useState(new AutomergeStoreAdapter(options));
  useEffect(() => {
    if (!object) {
      return;
    }

    if (object.canvas?.schema !== TLDRAW_SCHEMA) {
      log.warn('invalid schema', { schema: object.canvas?.schema });
      return;
    }

    adapter.open(createDocAccessor(object, ['content']));
    return () => adapter.close();
  }, [object]);

  return adapter;
};

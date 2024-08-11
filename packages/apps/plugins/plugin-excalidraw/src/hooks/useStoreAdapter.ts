//
// Copyright 2024 DXOS.org
//

import { useEffect, useState } from 'react';

import { createDocAccessor } from '@dxos/echo-db';
import { type EchoReactiveObject } from '@dxos/echo-schema';

import { ExcalidrawStoreAdapter, type ExcalidrawStoreAdapterProps } from './adapter';

export const useStoreAdapter = (
  object?: EchoReactiveObject<any>,
  onUpdate?: ExcalidrawStoreAdapterProps['onUpdate'],
) => {
  const [model] = useState<ExcalidrawStoreAdapter>(new ExcalidrawStoreAdapter({ onUpdate }));
  useEffect(() => {
    if (!object) {
      return;
    }

    model.open(createDocAccessor(object, ['content']));
    return () => model.close();
  }, [object]);

  return model;
};

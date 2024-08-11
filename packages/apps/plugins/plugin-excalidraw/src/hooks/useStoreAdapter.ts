//
// Copyright 2024 DXOS.org
//

import { useEffect, useState } from 'react';

import { type DiagramType, EXCALIDRAW_SCHEMA } from '@braneframe/types';
import { createDocAccessor } from '@dxos/echo-db';
import { type EchoReactiveObject } from '@dxos/echo-schema';
import { log } from '@dxos/log';

import { ExcalidrawStoreAdapter, type ExcalidrawStoreAdapterProps } from './adapter';

export const useStoreAdapter = (
  object?: EchoReactiveObject<DiagramType>,
  options: ExcalidrawStoreAdapterProps = {},
) => {
  const [model] = useState<ExcalidrawStoreAdapter>(new ExcalidrawStoreAdapter(options));
  useEffect(() => {
    if (!object) {
      return;
    }

    if (object.canvas?.schema !== EXCALIDRAW_SCHEMA) {
      log.warn('invalid schema', { schema: object.canvas?.schema });
      return;
    }

    model.open(createDocAccessor(object, ['content']));
    return () => {
      model.close();
    };
  }, [object]);

  return model;
};

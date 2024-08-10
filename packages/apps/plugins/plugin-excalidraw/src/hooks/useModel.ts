//
// Copyright 2024 DXOS.org
//

import { useEffect, useState } from 'react';

import { createDocAccessor } from '@dxos/echo-db';
import { type EchoReactiveObject } from '@dxos/echo-schema';

import { ExcalidrawModel } from './model';

export const useModel = (object?: EchoReactiveObject<any>) => {
  const [model] = useState<ExcalidrawModel>(new ExcalidrawModel());
  const [, forceUpdate] = useState({});
  useEffect(() => {
    if (!object) {
      return;
    }

    model.open(createDocAccessor(object, ['content']));
    forceUpdate({}); // TODO(burdon): Why?
    return () => model.close();
  }, [object]);

  return model;
};

//
// Copyright 2024 DXOS.org
//

import { useState } from 'react';

import { type EchoReactiveObject } from '@dxos/echo-schema';

import { ExcalidrawModel } from './model';

// TODO(burdon): Update model.
export const useModel = (object?: EchoReactiveObject<any>) => {
  const [model] = useState<ExcalidrawModel>(new ExcalidrawModel());
  return model;
};

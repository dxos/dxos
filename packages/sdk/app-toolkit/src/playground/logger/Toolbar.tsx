//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useCallback } from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useOperationInvoker } from '@dxos/app-framework/ui';
import { Button } from '@dxos/react-ui';

import { LogOperation } from './schema';

export const Logger = () => {
  const { invokePromise } = useOperationInvoker();
  const handleClick = useCallback(() => invokePromise(LogOperation, { message: 'Hello, world!' }), []);
  return <Button onClick={handleClick}>Log</Button>;
};

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(
      Capabilities.ReactSurface,
      Surface.create({
        id: 'dxos.org/test/logger/action',
        role: 'toolbar',
        component: Logger,
      }),
    ),
  ),
);

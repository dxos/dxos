//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useCallback } from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Hooks from '@dxos/app-framework/Hooks';
import * as Surface from '@dxos/app-framework/Surface';
import { Button } from '@dxos/react-ui';

import { PlaygroundRoles } from '../roles.ts';
import { LogOperation } from './schema.ts';

export const Logger = () => {
  const { invokePromise } = Hooks.useOperationInvoker();
  const handleClick = useCallback(() => invokePromise(LogOperation, { message: 'Hello, world!' }), []);
  return <Button onClick={handleClick}>Log</Button>;
};

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(
      Capabilities.ReactSurface,
      Surface.create({
        id: 'org.dxos.test.logger.action',
        filter: Surface.makeFilter(PlaygroundRoles.Toolbar),
        component: Logger,
      }),
    ),
  ),
);

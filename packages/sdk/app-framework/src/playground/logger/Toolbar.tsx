//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useCallback } from 'react';

import { Button } from '@dxos/react-ui';

import * as Common from '../../common';
import { Capability } from '../../core';
import { createIntent } from '../../plugin-intent';
import { useIntentDispatcher } from '../../react';

import { Log } from './schema';

export const Logger = () => {
  const { dispatchPromise } = useIntentDispatcher();
  const handleClick = useCallback(() => dispatchPromise(createIntent(Log, { message: 'Hello, world!' })), []);
  return <Button onClick={handleClick}>Log</Button>;
};

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(
      Common.Capability.ReactSurface,
      Common.createSurface({
        id: 'dxos.org/test/logger/action',
        role: 'toolbar',
        component: Logger,
      }),
    ),
  ),
);

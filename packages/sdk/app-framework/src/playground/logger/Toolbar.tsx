//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { Button } from '@dxos/react-ui';

import { Capabilities, createSurface } from '../../common';
import { contributes, defineCapabilityModule } from '../../core';
import { createIntent } from '../../plugin-intent';
import { useIntentDispatcher } from '../../react';

import { Log } from './schema';

export const Logger = () => {
  const { dispatchPromise } = useIntentDispatcher();
  const handleClick = useCallback(() => dispatchPromise(createIntent(Log, { message: 'Hello, world!' })), []);
  return <Button onClick={handleClick}>Log</Button>;
};

export default defineCapabilityModule(() =>
  contributes(
    Capabilities.ReactSurface,
    createSurface({
      id: 'dxos.org/test/logger/action',
      role: 'toolbar',
      component: Logger,
    }),
  ),
);

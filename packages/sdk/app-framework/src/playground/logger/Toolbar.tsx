//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { Button } from '@dxos/react-ui';

import { Log } from './schema';
import { Capabilities, createSurface } from '../../common';
import { contributes } from '../../core';
import { createIntent, useIntentDispatcher } from '../../plugin-intent';

export const Logger = () => {
  const { dispatchPromise } = useIntentDispatcher();
  const handleClick = useCallback(() => dispatchPromise(createIntent(Log, { message: 'Hello, world!' })), []);
  return <Button onClick={handleClick}>Log</Button>;
};

export default () =>
  contributes(
    Capabilities.ReactSurface,
    createSurface({
      id: 'dxos.org/test/logger/action',
      role: 'toolbar',
      component: Logger,
    }),
  );

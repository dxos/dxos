//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { Button } from '@dxos/react-ui';

import { Log } from './schema';
import { createIntent, useIntentDispatcher } from '../../../plugin-intent';
import { createSurface } from '../../../plugin-surface';
import { Capabilities } from '../../common';
import { contributes } from '../../plugin';

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

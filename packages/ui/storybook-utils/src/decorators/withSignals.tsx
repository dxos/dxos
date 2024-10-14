//
// Copyright 2023 DXOS.org
//

import { type Decorator } from '@storybook/react';
import React, { useEffect } from 'react';

import { registerSignalsRuntime } from '@dxos/echo-signals/react';

/**
 * Make objects created using `create` reactive.
 */
export const withSignals: Decorator = (Story) => {
  useEffect(() => {
    registerSignalsRuntime();
  }, []);

  return <Story />;
};

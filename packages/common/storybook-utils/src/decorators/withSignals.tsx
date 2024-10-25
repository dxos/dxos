//
// Copyright 2023 DXOS.org
//

import { type Decorator } from '@storybook/react';
import React from 'react';

import { registerSignalsRuntime } from '@dxos/echo-signals/react';

/**
 * Make objects created using @dxos/echo-schema `create` reactive.
 */
export const withSignals: Decorator = (Story) => {
  registerSignalsRuntime();
  return <Story />;
};

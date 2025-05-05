//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes } from '@dxos/app-framework';
import { DevtoolsContextProvider } from '@dxos/devtools';

import { DEBUG_PLUGIN } from '../meta';

export default () =>
  contributes(Capabilities.ReactContext, {
    id: DEBUG_PLUGIN,
    context: ({ children }) => <DevtoolsContextProvider>{children}</DevtoolsContextProvider>,
  });

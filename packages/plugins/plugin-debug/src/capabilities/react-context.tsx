//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { DevtoolsContextProvider } from '@dxos/devtools';

import { meta } from '../meta';

export default Capability.makeModule(() =>
  Capability.contributes(Capabilities.ReactContext, {
    id: meta.id,
    context: ({ children }) => <DevtoolsContextProvider>{children}</DevtoolsContextProvider>,
  }),
);

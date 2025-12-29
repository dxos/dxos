//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capability, Common } from '@dxos/app-framework';
import { DevtoolsContextProvider } from '@dxos/devtools';

import { meta } from '../meta';

export default Capability.makeModule(() =>
  Capability.contributes(Common.Capability.ReactContext, {
    id: meta.id,
    context: ({ children }) => <DevtoolsContextProvider>{children}</DevtoolsContextProvider>,
  }),
);

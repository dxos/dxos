//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { DevtoolsContextProvider } from '@dxos/devtools';

import { meta } from '../../meta';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactContext, {
      id: meta.id,
      context: ({ children }) => <DevtoolsContextProvider>{children}</DevtoolsContextProvider>,
    }),
  ),
);

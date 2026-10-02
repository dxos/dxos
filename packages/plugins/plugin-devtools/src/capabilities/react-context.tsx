//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Surface from '@dxos/app-framework/Surface';
import { DevtoolsContextProvider } from '@dxos/devtools';

import { meta } from '#meta';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactContext, {
      id: meta.profile.key,
      context: ({ children }) => (
        <Surface.Root.ProfilerProvider>
          <DevtoolsContextProvider>{children}</DevtoolsContextProvider>
        </Surface.Root.ProfilerProvider>
      ),
    }),
  ),
);

//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';

import { SimpleLayout } from '#components';
import { meta } from '#meta';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactRoot, {
      id: meta.profile.key,
      root: () => {
        return <SimpleLayout />;
      },
    }),
  ),
);

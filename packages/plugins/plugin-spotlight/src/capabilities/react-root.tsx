//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';

import { SpotlightLayout } from '#components';

import { SpotlightNamespace } from '../namespace.ts';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactRoot, {
      id: SpotlightNamespace.key,
      root: () => <SpotlightLayout />,
    }),
  ),
);

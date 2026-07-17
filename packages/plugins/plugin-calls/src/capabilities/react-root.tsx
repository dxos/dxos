//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';

import { meta } from '#meta';

import { Call } from '../components/Call';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    return [
      Capability.provide(Capabilities.ReactRoot, {
        id: meta.profile.key,
        root: () => <Call.Audio />,
      }),
    ];
  }),
);

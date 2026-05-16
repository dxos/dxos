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
    return Capability.contributes(Capabilities.ReactRoot, {
      id: meta.id,
      root: () => <Call.Audio />,
    });
  }),
);

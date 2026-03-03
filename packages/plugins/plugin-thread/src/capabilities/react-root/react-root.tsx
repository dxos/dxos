//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';

import { Call } from '../../components';
import { meta } from '../../meta';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    return Capability.contributes(Capabilities.ReactRoot, {
      id: meta.id,
      root: () => <Call.Audio />,
    });
  }),
);

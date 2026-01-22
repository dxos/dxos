//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capability, Common } from '@dxos/app-framework';
import { useCapability } from '@dxos/app-framework/react';

import { AwaitingObject } from '../../components';
import { meta } from '../../meta';
import { SpaceCapabilities } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Common.Capability.ReactRoot, {
      id: meta.id,
      root: () => {
        const store = useCapability(SpaceCapabilities.State);
        return store.values.awaiting ? <AwaitingObject id={store.values.awaiting} /> : null;
      },
    }),
  ),
);

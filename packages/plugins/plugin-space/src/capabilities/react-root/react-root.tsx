//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { useAtomCapability } from '@dxos/app-framework/ui';

import { AwaitingObject } from '../../components';
import { meta } from '../../meta';
import { SpaceCapabilities } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactRoot, {
      id: meta.id,
      root: () => {
        const ephemeral = useAtomCapability(SpaceCapabilities.EphemeralState);
        return ephemeral.awaiting ? <AwaitingObject id={ephemeral.awaiting} /> : null;
      },
    }),
  ),
);

//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';

import { Call } from '#components';
import { meta } from '#meta';

export const ReactRoot = AppCapability.reactRoot(
  () =>
    Effect.sync(() => {
      return Capability.contribute(Capabilities.ReactRoot, {
        id: meta.profile.key,
        root: Call.Audio,
      });
    }),
  {
    activatesOn: ClientEvents.Initialized,
  },
);

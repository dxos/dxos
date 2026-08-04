//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';

import { Call } from '#components';
import { meta } from '#meta';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    return Capability.contributes(Capabilities.ReactRoot, {
      id: meta.profile.key,
      root: Call.Audio,
    });
  }),
);

//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';

import { Call } from '#components';

import { CallsNamespace } from '../namespace.ts';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    return Capability.contribute(Capabilities.ReactRoot, {
      id: CallsNamespace.key,
      root: Call.Audio,
    });
  }),
);

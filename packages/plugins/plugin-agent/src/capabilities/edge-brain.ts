//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';

import { BrainService } from '#types';

import * as BrainWire from '../brain/BrainWire.ts';

//
// Capability Module
//
// On EDGE an agent's brain is a Durable Object the bundle reaches as plain data; this module turns it back into the
// `BrainService` the operations require.
//

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.HostServiceAdapter, {
      host: BrainWire.KEY,
      service: BrainService.key,
      make: BrainWire.make,
    }),
  ),
);

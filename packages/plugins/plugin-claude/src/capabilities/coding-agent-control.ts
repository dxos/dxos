//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as HostProcessControl from '@dxos/edge-compute/host-process-control';

import * as CodingAgentControl from '../CodingAgentControl.ts';

//
// Capability Module
//
// On EDGE the cloud coding run's operations reach the coding agent through the process control compute-service serves
// them as plain data; this module turns it into the `CodingAgentControl` they require.
//

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.HostServiceAdapter, {
      host: CodingAgentControl.KEY,
      service: CodingAgentControl.KEY,
      make: HostProcessControl.make,
    }),
  ),
);

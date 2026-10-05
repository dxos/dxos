//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as NodeSubprocess from '@dxos/compute-runtime/node-subprocess';
import * as LayerSpec from '@dxos/compute/LayerSpec';
import * as Subprocess from '@dxos/compute/Subprocess';

/** Lets the Claude Code process start the agent where the host is Node.js. */
export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(
      Capabilities.LayerSpec,
      LayerSpec.make(
        { affinity: 'application', requires: [], provides: [Subprocess.Subprocess] },
        () => NodeSubprocess.layer,
      ),
    ),
  ),
);

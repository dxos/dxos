//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as NodeShell from '@dxos/compute-runtime/node-shell';
import * as LayerSpec from '@dxos/compute/LayerSpec';
import * as ShellService from '@dxos/compute/ShellService';

/** Lets a process run shell commands where the host is Node.js, the Claude Code process among them. */
export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(
      Capabilities.LayerSpec,
      LayerSpec.make(
        { affinity: 'process', requires: [], provides: [ShellService.ShellService] },
        () => NodeShell.layer,
      ),
    ),
  ),
);

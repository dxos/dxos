//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { SpaceCapabilities } from '@dxos/plugin-space';

// TODO(wittjosiah): Remove?
export default Capability.makeModule(() =>
  Effect.succeed(Capability.contributes(SpaceCapabilities.Repair, async () => {})),
);

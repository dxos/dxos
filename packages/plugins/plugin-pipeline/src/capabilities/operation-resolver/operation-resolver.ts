//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.OperationResolver, []),
  ),
);

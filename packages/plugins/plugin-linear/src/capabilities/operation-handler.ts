//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';

import { LinearOperationHandlerSet } from '#operations';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [Capability.provide(Capabilities.OperationHandler, LinearOperationHandlerSet)];
  }),
);

//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';

import { CrmOperationHandlerSet } from '#operations';

export default Capability.makeModule(() =>
  Effect.succeed(Capability.provide(Capabilities.OperationHandler, CrmOperationHandlerSet)),
);

//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import type { OperationHandlerSet } from '@dxos/operation';

import { CrmHandlers } from '#operations';

export default Capability.makeModule<OperationHandlerSet.OperationHandlerSet>(() =>
  Effect.succeed(Capability.contributes(Capabilities.OperationHandler, CrmHandlers)),
);

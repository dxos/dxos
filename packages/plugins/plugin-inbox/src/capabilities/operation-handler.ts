//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { InboxOperationHandlerSet } from '#operations';
import type { OperationHandlerSet } from '@dxos/operation';

export default Capability.makeModule<OperationHandlerSet.OperationHandlerSet>(
  Effect.fnUntraced(function* () {
    return Capability.contributes(Capabilities.OperationHandler, InboxOperationHandlerSet);
  }),
);

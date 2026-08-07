//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';

import { CrmOperationHandlerSet } from '#operations';

export default Capability.makeModule(() =>
  Effect.succeed(Capability.contribute(Capabilities.OperationHandler, CrmOperationHandlerSet)),
);

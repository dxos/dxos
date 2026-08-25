//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';

import { ProjectOperationHandlerSet } from '#operations';
import { ProjectHandlers } from '#skills';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributeAll(Capabilities.OperationHandler, [
      ProjectOperationHandlerSet.handlers,
      // The skill's own artifact verbs, which moved here with it.
      ProjectHandlers,
    ]);
  }),
);

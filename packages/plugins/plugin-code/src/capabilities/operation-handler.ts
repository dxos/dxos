//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';

import { CodeOperationHandlerSet, FeatureOperationHandlerSet } from '#operations';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [
      Capability.contribute(Capabilities.OperationHandler, CodeOperationHandlerSet),
      Capability.contribute(Capabilities.OperationHandler, FeatureOperationHandlerSet.handlers),
    ];
  }),
);

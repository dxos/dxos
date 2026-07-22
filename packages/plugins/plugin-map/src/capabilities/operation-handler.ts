//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';

import { MapOperationHandlerSet } from '#operations';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [Capability.provide(Capabilities.OperationHandler, MapOperationHandlerSet)];
  }),
);

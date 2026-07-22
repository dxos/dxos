//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';

import { TestingOperationHandlerSet } from '#operations';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [Capability.provide(Capabilities.OperationHandler, TestingOperationHandlerSet)];
  }),
);

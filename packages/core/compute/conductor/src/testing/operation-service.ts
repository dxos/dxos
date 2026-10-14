//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as Operation from '@dxos/compute/Operation';

/** `Operation.Service` stub for tests that require the tag but never invoke operations; any call dies loudly. */
export const operationServiceLayerStub = Layer.succeed(Operation.Service, {
  invoke: () => Effect.die('Operation.Service not available in test.'),
  schedule: () => Effect.die('Operation.Service not available in test.'),
  invokePromise: async () => ({ error: new Error('Operation.Service not available in test.') }),
} satisfies Operation.OperationService);

//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as Operation from '../Operation';

const operationServiceStub: Operation.OperationService = {
  invoke: () => Effect.die('operationServiceLayerNoop: invoke is not implemented.'),
  schedule: () => Effect.die('operationServiceLayerNoop: schedule is not implemented.'),
  invokePromise: () =>
    Promise.resolve({ error: new Error('operationServiceLayerNoop: invokePromise is not implemented.') }),
};

/** Noop `Operation.Service` for tests that must satisfy the type without invoking it. */
export const operationServiceLayerNoop: Layer.Layer<Operation.Service> = Layer.succeed(
  Operation.Service,
  operationServiceStub,
);

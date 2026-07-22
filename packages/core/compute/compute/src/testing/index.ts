//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as Operation from '../Operation';
import * as OperationHandlerSet from '../OperationHandlerSet';

export { Fibonacci, Reply, Sleep } from './definitions';
export { default as FibonacciHandler } from './fib';
export { default as ReplyHandler } from './reply';
export { default as SleepHandler } from './sleep';

export const ExampleHandlers = OperationHandlerSet.lazy(
  () => import('./fib'),
  () => import('./reply'),
  () => import('./sleep'),
);

/**
 * Noop `Operation.Service` layer for testing — every invocation dies. Use in test layer stacks
 * that require `Operation.Service` to satisfy a type but never actually invoke/schedule an
 * operation on that path.
 */
export const operationServiceLayerNoop: Layer.Layer<Operation.Service> = Layer.succeed(Operation.Service, {
  invoke: () => Effect.die('operationServiceLayerNoop: invoke is not implemented.'),
  schedule: () => Effect.die('operationServiceLayerNoop: schedule is not implemented.'),
  invokePromise: () => Promise.reject(new Error('operationServiceLayerNoop: invokePromise is not implemented.')),
  // Operation.OperationService.invoke is a complex overloaded type; a partial test stub cannot
  // express all overload variants without the cast.
} as unknown as Operation.OperationService);

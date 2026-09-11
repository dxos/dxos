//
// Copyright 2025 DXOS.org
//

import * as Operation from '../Operation.ts';
import * as OperationHandlerSet from '../OperationHandlerSet.ts';
import { Fibonacci, Reply, Sleep } from './definitions.ts';

export { Fibonacci, Reply, Sleep } from './definitions.ts';
export { default as FibonacciHandler } from './fib.ts';
export { default as ReplyHandler } from './reply.ts';
export { default as SleepHandler } from './sleep.ts';
export * from './operation.ts';

export const ExampleHandlers = OperationHandlerSet.lazy([
  Fibonacci.pipe(Operation.lazyHandler(() => import('./fib.ts'))),
  Reply.pipe(Operation.lazyHandler(() => import('./reply.ts'))),
  Sleep.pipe(Operation.lazyHandler(() => import('./sleep.ts'))),
]);

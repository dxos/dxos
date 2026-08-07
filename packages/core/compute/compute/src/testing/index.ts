//
// Copyright 2025 DXOS.org
//

import * as Operation from '../Operation';
import * as OperationHandlerSet from '../OperationHandlerSet';
import { Fibonacci, Reply, Sleep } from './definitions';

export { Fibonacci, Reply, Sleep } from './definitions';
export { default as FibonacciHandler } from './fib';
export { default as ReplyHandler } from './reply';
export { default as SleepHandler } from './sleep';
export * from './operation';

export const ExampleHandlers = OperationHandlerSet.lazy([
  Fibonacci.pipe(Operation.lazyHandler(() => import('./fib'))),
  Reply.pipe(Operation.lazyHandler(() => import('./reply'))),
  Sleep.pipe(Operation.lazyHandler(() => import('./sleep'))),
]);

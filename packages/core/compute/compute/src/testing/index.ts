//
// Copyright 2025 DXOS.org
//

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

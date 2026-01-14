//
// Copyright 2025 DXOS.org
//

export * from './errors';

// Export as namespaces for organized access.
export * as Operation from './operation';
export * as OperationInvoker from './invoker';
export * as OperationResolver from './resolver';

// Also export common types directly for convenience.
export type {
  OperationDefinition,
  OperationHandler,
  OperationProps,
} from './operation';
export { make, withHandler } from './operation';

// Export service convenience functions directly for ergonomic use.
// This allows: import * as Operation from '@dxos/operation'; Operation.invoke(...);
export { invoke, schedule, invokePromise, invokeSync, Service } from './service';
export type { InvokeOptions, OperationService } from './service';

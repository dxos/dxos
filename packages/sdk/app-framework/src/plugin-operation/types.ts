//
// Copyright 2025 DXOS.org
//

import type * as Effect from 'effect/Effect';

import type { OperationDefinition, OperationHandler } from '@dxos/operation';
import type { Position } from '@dxos/util';

/**
 * Handler registration contributed by plugins.
 */
export type OperationHandlerRegistration = {
  operation: OperationDefinition<any, any>;
  handler: OperationHandler<any, any, any, any>;
  position?: Position;
  filter?: (input: any) => boolean;
};

/**
 * Undo mapping registration contributed by plugins.
 */
export type UndoMappingRegistration = {
  operation: OperationDefinition<any, any>;
  inverse: OperationDefinition<any, any>;
  deriveContext: (input: any, output: any) => any;
};

/**
 * Invocation event emitted after each operation.
 */
export type InvocationEvent<I = any, O = any> = {
  operation: OperationDefinition<I, O>;
  input: I;
  output: O;
  timestamp: number;
};

/**
 * History entry stored by HistoryTracker.
 */
export type HistoryEntry = {
  operation: OperationDefinition<any, any>;
  input: any;
  output: any;
  inverse: OperationDefinition<any, any>;
  inverseInput: any;
  timestamp: number;
};

/**
 * OperationInvoker capability interface.
 */
export type OperationInvokerInterface = {
  invoke: <I, O>(op: OperationDefinition<I, O>, input: I) => Effect.Effect<O, Error>;
  invokePromise: <I, O>(op: OperationDefinition<I, O>, input: I) => Promise<{ data?: O; error?: Error }>;
  invokeInternal: <I, O>(op: OperationDefinition<I, O>, input: I) => Effect.Effect<O, Error>;
  subscribe: (handler: (event: InvocationEvent) => void) => () => void;
};

/**
 * UndoRegistry capability interface.
 */
export type UndoRegistryInterface = {
  lookup: (
    operation: OperationDefinition<any, any>,
  ) =>
    | {
        inverse: OperationDefinition<any, any>;
        deriveContext: (input: any, output: any) => any;
      }
    | undefined;
};

/**
 * HistoryTracker capability interface.
 */
export type HistoryTrackerInterface = {
  undo: () => Effect.Effect<void, Error>;
  undoPromise: () => Promise<{ error?: Error }>;
  canUndo: () => boolean;
};


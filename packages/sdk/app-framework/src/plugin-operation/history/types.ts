//
// Copyright 2025 DXOS.org
//

import type { OperationDefinition } from '@dxos/operation';

/**
 * Undo mapping registration contributed by plugins.
 */
export type UndoMappingRegistration = {
  operation: OperationDefinition<any, any>;
  inverse: OperationDefinition<any, any>;
  deriveContext: (input: any, output: any) => any;
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

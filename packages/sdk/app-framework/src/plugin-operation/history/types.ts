//
// Copyright 2025 DXOS.org
//

import type { OperationDefinition } from '@dxos/operation';

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

//
// Copyright 2025 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';

/**
 * History entry stored by HistoryTracker.
 */
export type HistoryEntry = {
  operation: Operation.Definition<any, any>;
  input: any;
  output: any;
  inverse: Operation.Definition<any, any>;
  inverseInput: any;
  timestamp: number;
};

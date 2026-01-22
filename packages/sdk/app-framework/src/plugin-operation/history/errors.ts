//
// Copyright 2025 DXOS.org
//

import { OperationError } from '@dxos/operation';

export class EmptyHistoryError extends OperationError {
  constructor() {
    super('EMPTY_HISTORY', 'Cannot undo: history is empty.');
  }
}

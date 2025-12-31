//
// Copyright 2025 DXOS.org
//

/**
 * Error thrown when no handler is found for an operation.
 */
export class NoHandlerError extends Error {
  constructor(operationKey: string) {
    super(`No handler found for operation: ${operationKey}`);
    this.name = 'NoHandlerError';
  }
}

/**
 * Error thrown when undo is called but history is empty.
 */
export class EmptyHistoryError extends Error {
  constructor() {
    super('Cannot undo: history is empty');
    this.name = 'EmptyHistoryError';
  }
}

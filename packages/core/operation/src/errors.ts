//
// Copyright 2025 DXOS.org
//

/**
 * NOTE: Messages should be sentences (Start with a capital letter and end with a period).
 * Errors can optionally include a JSON context object.
 */
export class OperationError extends Error {
  constructor(
    readonly code: string,
    message?: string,
    readonly context?: Record<string, any>,
  ) {
    super(message ?? code, { cause: context });
    this.name = code;
    // NOTE: Restores prototype chain (https://stackoverflow.com/a/48342359).
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NoHandlerError extends OperationError {
  constructor(operationKey: string) {
    super('NO_HANDLER', `No handler found for operation: ${operationKey}.`, { operationKey });
  }
}

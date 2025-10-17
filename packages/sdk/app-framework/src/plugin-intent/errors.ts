//
// Copyright 2025 DXOS.org
//

// TODO(wittjosiah): Reconcile with @dxos/protocols. Factor out errors.

/**
 * NOTE: Messages should be sentences (Start with a capital letter and end with a period).
 * Errors can optionally include a JSON context object.
 */
export class BaseError extends Error {
  constructor(
    readonly code: string,
    message?: string,
    readonly context?: Record<string, any>,
  ) {
    // TODO(dmaretskyi): Error.cause.
    super(message ?? code, { cause: context });
    this.name = code;
    // NOTE: Restores prototype chain (https://stackoverflow.com/a/48342359).
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NoResolversError extends BaseError {
  constructor(action: string) {
    super('NO_RESOLVERS', `No resolvers were found for the action: ${action}`, { action });
  }
}

// TODO(burdon): Detect loops.
export class CycleDetectedError extends BaseError {
  constructor(context?: Record<string, any>) {
    super(
      'CYCLE_DETECTED',
      'Intent execution limit exceeded. This is likely due to an infinite loop within intent resolvers.',
      context,
    );
  }
}

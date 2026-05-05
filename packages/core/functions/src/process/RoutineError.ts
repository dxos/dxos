//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/**
 * Error produced when an agent fails to complete a routine.
 */
export class RoutineError extends BaseError.extend('RoutineError') {
  constructor(
    message: string,
    context: {
      description?: string;
    } = {},
  ) {
    super({
      message,
      context,
    });
  }
}

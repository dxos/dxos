//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';
import { type EID } from '@dxos/keys';

/**
 * Agent could not execute prompt.
 */
export class PromptError extends BaseError.extend('PromptError') {
  constructor(
    message: string,
    context: {
      description?: string;
      prompt?: EID.EID;
      chat?: EID.EID;
    },
  ) {
    super({
      message,
      context,
    });
  }
}

/**
 * Exactly-one invariant violated for an object bound to the harness conversation context.
 */
export class HarnessContextError extends BaseError.extend('HarnessContextError', 'Harness context invariant violated') {
  constructor(context: { type: string; count: number }) {
    super({
      message: `There should be exactly one ${context.type} in context. Got: ${context.count}.`,
      context,
    });
  }
}

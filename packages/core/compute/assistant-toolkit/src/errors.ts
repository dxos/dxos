//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/**
 * Agent could not execute prompt.
 */
export class PromptError extends BaseError.extend('PromptError') {
  constructor(
    message: string,
    context: {
      description?: string;
      prompt?: string;
      chat?: string;
    },
  ) {
    super({
      message,
      context,
    });
  }
}

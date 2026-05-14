//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';
import { type EchoId } from '@dxos/keys';

/**
 * Agent could not execute prompt.
 */
export class PromptError extends BaseError.extend('PromptError') {
  constructor(
    message: string,
    context: {
      description?: string;
      prompt?: EchoId.EchoId;
      chat?: EchoId.EchoId;
    },
  ) {
    super({
      message,
      context,
    });
  }
}

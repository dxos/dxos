//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';
import { type EchoURI } from '@dxos/keys';

/**
 * Agent could not execute prompt.
 */
export class PromptError extends BaseError.extend('PromptError') {
  constructor(
    message: string,
    context: {
      description?: string;
      prompt?: EchoURI.EchoURI;
      chat?: EchoURI.EchoURI;
    },
  ) {
    super({
      message,
      context,
    });
  }
}

//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';
import { DXN } from '@dxos/keys';

/**
 * Agent could not execute prompt.
 */
export class PromptError extends BaseError.extend('PromptError') {
  constructor(
    message: string,
    context: {
      descripion?: string;
      prompt?: DXN.String;
      chat?: DXN.String;
    },
  ) {
    super({
      message,
      context,
    });
  }
}

//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';
import { LegacyDXN as DXN } from '@dxos/keys';

/**
 * Agent could not execute prompt.
 */
export class PromptError extends BaseError.extend('PromptError') {
  constructor(
    message: string,
    context: {
      description?: string;
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

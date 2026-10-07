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
 * A batch of task changes was rejected as a whole; the message lists every bad change and the
 * current checklist so the model can resend.
 */
export class UpdateTasksError extends BaseError.extend('UpdateTasksError') {
  constructor(message: string) {
    super({ message });
  }
}

/** Toolkit operation failed. The underlying failure, where there is one, is the `cause`. */
export class ToolkitError extends BaseError.extend('ToolkitError', 'Toolkit operation failed.') {}

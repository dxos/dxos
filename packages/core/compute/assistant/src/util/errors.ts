//
// Copyright 2025 DXOS.org
//

import { BaseError } from '@dxos/errors';

/**
 * Generic error from AI model.
 */
export class AiModelError extends BaseError.extend('AiModelError', 'AI model error') {}

/**
 * Generic error for AI agent execution.
 */
export class AiAssistantError extends BaseError.extend('AiAssistantError', 'AI assistant error') {}

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

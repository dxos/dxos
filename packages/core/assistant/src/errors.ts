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

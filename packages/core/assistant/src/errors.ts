//
// Copyright 2025 DXOS.org
//

import { BaseError } from '@dxos/errors';

/**
 * Generic error from AI model.
 */
export class AiModelError extends BaseError.extend('AI_MODEL_ERROR', 'AI model error') {}

/**
 * Generic error for AI agent execution.
 */
export class AiAssistantError extends BaseError.extend('AI_ASSISTANT_ERROR', 'AI assistant error') {}

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

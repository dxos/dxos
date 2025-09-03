//
// Copyright 2025 DXOS.org
//

import { BaseError } from '@dxos/errors';

/**
 * Generic error for AI agent execution.
 */
export class AiAssistantError extends BaseError.extend('AI_ASSISTANT_ERROR') {}

/**
 * Parsed error from the anthropic API.
 */
export class AnthropicError extends BaseError.extend('ANTHROPIC_ERROR') {}

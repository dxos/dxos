import { BaseError } from '@dxos/errors';

/**
 * Generic error for AI agent execution.
 */
export class AiAssistantError extends BaseError.extend('AI_ASSISTANT_ERROR') {}

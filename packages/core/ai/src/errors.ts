//
// Copyright 2025 DXOS.org
//

import { BaseError, type BaseErrorOptions } from '@dxos/errors';

import { type ModelName } from './model';

export class PromptPreprocessingError extends BaseError.extend(
  'AI_INPUT_PREPROCESSOR_ERROR',
  'AI Input preprocessing error',
) {}

export class AiModelNotAvailableError extends BaseError.extend('AI_MODEL_NOT_AVAILABLE', 'AI Model not available') {
  constructor(model: ModelName, options?: Omit<BaseErrorOptions, 'context'>) {
    super({ context: { model }, ...options });
  }
}

export class AiToolNotFoundError extends BaseError.extend('AI_TOOL_NOT_FOUND', 'AI Tool not found') {
  constructor(name: string, options?: Omit<BaseErrorOptions, 'context'>) {
    super({ context: { name }, ...options });
  }
}

export class AiServiceOverloadedError extends BaseError.extend('AI_SERVICE_OVERLOADED', 'AI Service overloaded') {}

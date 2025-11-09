//
// Copyright 2025 DXOS.org
//

import { BaseError, type BaseErrorOptions } from '@dxos/errors';

import { type ModelName } from './defs';

export class PromptPreprocessingError extends BaseError.extend(
  'AI_INPUT_PREPROCESSOR_ERROR',
  'AI Input preprocessing error',
) {}

export class AiModelNotAvailableError extends BaseError.extend('AI_MODEL_NOT_AVAILABLE') {
  constructor(model: ModelName, options?: Omit<BaseErrorOptions, 'context'>) {
    super({ message: `AI Model not available: ${model}`, context: { model }, ...options });
  }
}

export class AiToolNotFoundError extends BaseError.extend('AI_TOOL_NOT_FOUND') {
  constructor(name: string, options?: Omit<BaseErrorOptions, 'context'>) {
    super({ message: `AI Tool not found: ${name}`, context: { name }, ...options });
  }
}

export class AiServiceOverloadedError extends BaseError.extend('AI_SERVICE_OVERLOADED', 'AI Service overloaded') {}

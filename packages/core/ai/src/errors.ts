//
// Copyright 2025 DXOS.org
//

import { BaseError } from '@dxos/errors';

import { type ModelName } from './model';

export class AiInputPreprocessingError extends BaseError.extend('AI_INPUT_PREPROCESSING_ERROR') {}

export class AiModelNotAvailableError extends BaseError.extend('AI_MODEL_NOT_AVAILABLE') {
  constructor(model: ModelName) {
    super(`AI Model not available: ${model}`);
  }
}

export class AiToolNotFoundError extends BaseError.extend('AI_TOOL_NOT_FOUND') {}

export class AiServiceOverloadedError extends BaseError.extend('AI_SERVICE_OVERLOADED') {}

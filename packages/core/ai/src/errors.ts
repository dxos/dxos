//
// Copyright 2025 DXOS.org
//

import { BaseError } from '@dxos/errors';

import type { LLMModel } from './types';

export class AiInputPreprocessingError extends BaseError.extend('AI_INPUT_PREPROCESSING_ERROR') {}

export class AiModelNotAvailableError extends BaseError.extend('AI_MODEL_NOT_AVAILABLE') {
  constructor(model: LLMModel) {
    super(`AI Model not available: ${model}`);
  }
}

//
// Copyright 2025 DXOS.org
//

import { BaseError, type BaseErrorOptions } from '@dxos/errors';
import { DXN } from '@dxos/keys';

export class PromptPreprocessingError extends BaseError.extend(
  'AiInputPreprocessorError',
  'AI Input preprocessing error',
) {}

export class AiModelNotAvailableError extends BaseError.extend('AiModelNotAvailableError') {
  constructor(model: DXN.DXN, options?: Omit<BaseErrorOptions, 'context'>) {
    super({ message: `AI Model not available: ${model}`, context: { model }, ...options });
  }
}

export class AiToolNotFoundError extends BaseError.extend('AiToolNotFoundError') {
  constructor(name: string, options?: Omit<BaseErrorOptions, 'context'>) {
    super({ message: `AI Tool not found: ${name}`, context: { name }, ...options });
  }
}

export class AiServiceOverloadedError extends BaseError.extend('AiServiceOverloadedError', 'AI Service overloaded') {}

/** Failure of an Ollama administrative request (transport, non-OK status, or a pull error frame). */
export class OllamaError extends BaseError.extend('OllamaError', 'Ollama admin request failed') {
  constructor(message: string, options?: Omit<BaseErrorOptions, 'context'>) {
    super({ message, ...options });
  }
}

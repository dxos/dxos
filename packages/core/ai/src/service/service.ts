//
// Copyright 2025 DXOS.org
//

import { type AiLanguageModel } from '@effect/ai';
import { Context, Effect, Layer } from 'effect';

import { type AiModelNotAvailableError } from '../errors';
import { type GenerateRequest, type GenerationStreamEvent, type GenerateResponse, type LLMModel } from '../types';

/**
 * AI Model Factory.
 */
export class AiService extends Context.Tag('AiService')<
  AiService,
  {
    readonly model: (model: LLMModel) => Layer.Layer<AiLanguageModel.AiLanguageModel, AiModelNotAvailableError, never>;
  }
>() {
  static model: (model: LLMModel) => Layer.Layer<AiLanguageModel.AiLanguageModel, AiModelNotAvailableError, AiService> =
    (model) =>
      AiService.pipe(
        Effect.map((_) => _.model(model)),
        Layer.unwrapEffect,
      );

  /** @deprecated */
  static make = (client: AiServiceClient): Context.Tag.Service<AiService> => {
    return {
      model(model) {
        throw new Error('Not implemented');
      },
    };
  };

  // static makeLayer = (client: AiServiceClient): Layer.Layer<AiService> =>
  //   Layer.succeed(AiService, AiService.make(client));

  static notAvailable = Layer.succeed(AiService, {
    model(model) {
      throw new Error('Not implemented');
    },
  });
}

/**
 * Interface for AI service.
 * Generates chat completions, supports, history and tools.
 * @deprecated
 */
export interface AiServiceClient {
  /**
   * Generate chat completions, supports, history and tools.
   * Generate non-streaming response.
   */
  exec(request: GenerateRequest): Promise<GenerateResponse>;

  /**
   * Generate chat completions, supports, history and tools.
   * Process request and open message stream.
   */
  execStream(request: GenerateRequest): Promise<GenerationStream>;
}

/**
 * Streaming chat completion stream.
 * @depreacted
 */
export interface GenerationStream extends AsyncIterable<GenerationStreamEvent> {
  /**
   * Stop the generation
   */
  abort(): void;

  /**
   * Wait for the stream to finish.
   */
  complete(): Promise<void>;
}

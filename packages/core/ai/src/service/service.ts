//
// Copyright 2025 DXOS.org
//

import { type GenerateRequest, type GenerationStreamEvent, type GenerateResponse } from '../types';

/**
 * Interface for AI service.
 * Generates chat completions, supports, history and tools.
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

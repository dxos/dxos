//
// Copyright 2025 DXOS.org
//

import { createTestSSEStream } from './test-stream';
import { createGenerationStream, type GenerationStream, type AIServiceClient } from '../service';
import { type GenerateRequest, type GenerateResponse } from '../types';

export class MockAIService implements AIServiceClient {
  constructor(private readonly _responses: string[]) {}

  /**
   * Generate non-streaming response.
   */
  async exec(request: GenerateRequest): Promise<GenerateResponse> {
    throw new Error('Not implemented');
  }

  // TODO(burdon): Match response to request.
  // TODO(burdon): See MockGpt (from conductor).
  async execStream(request: GenerateRequest): Promise<GenerationStream> {
    return createGenerationStream(new Response(createTestSSEStream(this._responses)));
  }
}

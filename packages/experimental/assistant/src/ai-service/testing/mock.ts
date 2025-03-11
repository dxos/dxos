//
// Copyright 2025 DXOS.org
//

import { type GenerationStream, type AIService, type GenerateRequest, createGenerationStream } from '@dxos/assistant';

import { createTestSSEStream } from './test-stream';

export class MockAIService implements AIService {
  constructor(private readonly _responses: string[]) {}

  // TODO(burdon): Match response to request.
  // TODO(burdon): See MockGpt (from conductor).
  async exec(request: GenerateRequest): Promise<GenerationStream> {
    return createGenerationStream(new Response(createTestSSEStream(this._responses)));
  }
}

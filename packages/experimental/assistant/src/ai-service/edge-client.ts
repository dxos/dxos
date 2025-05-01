//
// Copyright 2024 DXOS.org
//

import { assertArgument, invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import type { AIServiceClient, GenerationStream } from './service';
import { createGenerationStream } from './stream';
import { type GenerateRequest, type GenerateResponse } from './types';

export type AIServiceEdgeClientOptions = {
  endpoint: string;
};

export class AIServiceEdgeClient implements AIServiceClient {
  private readonly _endpoint: string;

  constructor({ endpoint }: AIServiceEdgeClientOptions) {
    invariant(endpoint, 'endpoint is required');
    this._endpoint = endpoint;
  }

  /**
   * Generate non-streaming response.
   */
  async exec(request: GenerateRequest): Promise<GenerateResponse> {
    throw new Error('Not implemented');
  }

  /**
   * Process request and open message stream.
   */
  async execStream(request: GenerateRequest): Promise<GenerationStream> {
    assertArgument(typeof request.model === 'string', 'model is required');
    log('requesting', { endpoint: this._endpoint });
    const controller = new AbortController();
    const response = await fetch(`${this._endpoint}/generate`, {
      signal: controller.signal,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // TODO(dmaretskyi): Errors if tools are not provided.
        tools: request.tools ?? [],
        ...request,
      }),
    });

    if (!response.ok) {
      throw await parseErrorResponse(response);
    }

    invariant(response.body instanceof ReadableStream);
    return createGenerationStream(response, controller);
  }
}

const parseErrorResponse = async (response: Response): Promise<Error> => {
  throw new Error(`AI Service error: ${response.status} ${response.statusText} ${await response.text()}`);
};

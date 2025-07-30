//
// Copyright 2024 DXOS.org
//

// TODO(dmaretskyi): Kill this.
// @ts-nocheck

import { assertArgument, invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import type { AiServiceClient, GenerationStream } from './service';
import { type GenerateRequest, type GenerateResponse, type LLMModel } from '../../types';

/**
 * @deprecated
 */
export type AiServiceEdgeClientOptions = {
  endpoint: string;
  defaultGenerationOptions?: {
    model?: LLMModel;
  };
};

/**
 * @deprecated
 */
export class EdgeAiServiceClient implements AiServiceClient {
  private readonly _endpoint: string;
  private readonly _defaultGenerationOptions: AiServiceEdgeClientOptions['defaultGenerationOptions'];

  constructor({ endpoint, defaultGenerationOptions }: AiServiceEdgeClientOptions) {
    invariant(endpoint, 'endpoint is required');
    this._endpoint = endpoint;
    this._defaultGenerationOptions = defaultGenerationOptions;
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
    assertArgument(
      typeof request.model === 'string' || typeof this._defaultGenerationOptions?.model === 'string',
      'model is required',
    );

    log('requesting', { endpoint: this._endpoint });
    const controller = new AbortController();
    const response = await fetch(`${this._endpoint}/generate`, {
      signal: controller.signal,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...request,
        model: request.model ?? this._defaultGenerationOptions?.model,
        // TODO(dmaretskyi): Errors if tools are not provided.
        tools: request.tools ?? [],
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

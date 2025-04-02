//
// Copyright 2024 DXOS.org
//

import { Schema as S } from 'effect';

import { Message } from '@dxos/artifact';
import { assertArgument, invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import type { AIServiceClient, GenerationStream } from './service';
import { createGenerationStream } from './stream';
import { type GenerateRequest } from './types';

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
   * @deprecated
   */
  // TODO(burdon): Remove.
  async appendMessages(messages: Message[]): Promise<void> {
    const url = `${this._endpoint}/message`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: await S.encodePromise(S.Array(Message))(messages),
      }),
    });

    if (!res.ok) {
      throw new Error(`${await res.text()} [${url}]`);
    }
  }

  /**
   * Process request and open message stream.
   */
  async exec(request: GenerateRequest): Promise<GenerationStream> {
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

    invariant(response.body instanceof ReadableStream);
    return createGenerationStream(response, controller);
  }
}

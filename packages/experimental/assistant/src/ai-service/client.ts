//
// Copyright 2024 DXOS.org
//

import { Schema as S } from '@effect/schema';

import { Message, type Space, type Thread } from '@dxos/artifact';
import { invariant } from '@dxos/invariant';
import { type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

import { createGenerationStream, type GenerationStream } from './stream';
import { type GenerateRequest } from './types';

export interface AIService {
  exec(request: GenerateRequest): Promise<GenerationStream>;
}

export interface AIServiceClient extends AIService {
  getSpace(spaceId: SpaceId): Promise<Space>;
  getThread(spaceId: SpaceId, threadId: string): Promise<Thread>;
  getMessages(spaceId: SpaceId, threadId: string): Promise<Message[]>;
  appendMessages(messages: Message[]): Promise<void>;
  updateMessage(spaceId: SpaceId, threadId: string, messageId: string, message: Message): Promise<void>;
}

export type AIServiceClientParams = {
  endpoint: string;
};

/**
 * Edge GPT client.
 */
// TODO(burdon): Create mock.
export class AIServiceClientImpl implements AIServiceClient {
  private readonly _endpoint: string;

  constructor({ endpoint }: AIServiceClientParams) {
    invariant(endpoint, 'endpoint is required');
    this._endpoint = endpoint;
  }

  async getSpace(spaceId: SpaceId): Promise<Space> {
    throw new Error('Not implemented');
  }

  async getThread(spaceId: SpaceId, threadId: string): Promise<Thread> {
    throw new Error('Not implemented');
  }

  async getMessages(spaceId: SpaceId, threadId: string): Promise<Message[]> {
    const res = await fetch(`${this._endpoint}/space/${spaceId}/thread/${threadId}/message`);
    return S.decodePromise(S.Array(Message).pipe(S.mutable))((await res.json()).data.results);
  }

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

  // TODO(dmaretskyi): Accept partial message schema.
  async updateMessage(spaceId: SpaceId, threadId: string, messageId: string, message: Message): Promise<void> {
    throw new Error('Not implemented');
  }

  /**
   * Process request and open message stream.
   */
  async exec(request: GenerateRequest): Promise<GenerationStream> {
    // TODO(dmaretskyi): Errors if tools are not provided.
    request = {
      tools: request.tools ?? [],
      ...request,
    };

    log.info('requesting', { endpoint: this._endpoint });
    const controller = new AbortController();
    const response = await fetch(`${this._endpoint}/generate`, {
      signal: controller.signal,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    invariant(response.body instanceof ReadableStream);
    return createGenerationStream(response, controller);
  }
}

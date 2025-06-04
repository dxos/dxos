//
//
//

//
// Copyright 2025 DXOS.org
//

import {
  type AIServiceClient,
  type GenerateResponse,
  type GenerateRequest,
  type GenerationStream,
  type GenerationStreamEvent,
  GenerationStreamImpl,
} from '@dxos/ai';
import { ObjectId } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

type PromptSession = {
  prompt: (prompt: string) => Promise<string>;
  promptStreaming: (prompt: string) => ReadableStream<string>;
  destroy: () => Promise<void>;
};

// @see https://developer.chrome.com/docs/extensions/ai/prompt-api
export class ChromePromptClient implements AIServiceClient {
  async exec(request: GenerateRequest): Promise<GenerateResponse> {
    const session: PromptSession = await this._getSession();
    const response = await session.prompt(this._getPrompt(request));
    await session.destroy();
    return {
      messages: [
        {
          id: ObjectId.random(),
          role: 'assistant',
          content: [{ type: 'text', text: response }],
        },
      ],
    };
  }

  async execStream(request: GenerateRequest): Promise<GenerationStream> {
    const session: PromptSession = await this._getSession();
    log.info('Creating session', { request });

    const prompt = this._getPrompt(request);

    log.info('prompt', { prompt });

    const stream = session.promptStreaming(prompt);

    const controller = new AbortController();

    const asyncIterator = async function* (): AsyncIterableIterator<GenerationStreamEvent> {
      try {
        // Start the message
        yield {
          type: 'message_start',
          message: {
            id: ObjectId.random(),
            role: 'assistant',
            content: [],
          },
        };

        // Start the text content block
        yield {
          type: 'content_block_start',
          index: 0,
          content: {
            type: 'text',
            text: '',
          },
        };

        // Read from the Chrome stream and emit text deltas
        const reader = stream.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            yield {
              type: 'content_block_delta',
              index: 0,
              delta: {
                type: 'text_delta',
                text: value,
              },
            };
          }
        } finally {
          reader.releaseLock();
        }

        // End the content block and message
        yield {
          type: 'content_block_stop',
          index: 0,
        };

        yield {
          type: 'message_stop',
        };
      } finally {
        await session.destroy();
      }
    };

    return new GenerationStreamImpl(controller, asyncIterator);
  }

  private _getPrompt(request: GenerateRequest) {
    invariant(request.history, 'History is required');
    return request.history
      .flatMap((message) => message.content.filter((block) => block.type === 'text').map((block) => block.text))
      .join('\n');
  }

  private _getSession(): Promise<PromptSession> {
    // Note: topK and temperature are set to 1 and 0 to avoid hallucinations.
    return (window as any).LanguageModel.create({ topK: 1, temperature: 0 });
  }
}

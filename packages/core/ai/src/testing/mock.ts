//
// Copyright 2025 DXOS.org
//

// TODO(dmaretskyi): Fix this.
// @ts-nocheck

import { type Signal, signal } from '@preact/signals-core';

import { Obj } from '@dxos/echo';
import { DataType } from '@dxos/schema';

import { createReplaySSEStream } from './test-stream';
import { type GenerationStream, type AiServiceClient } from '../deprecated/service';
import { type GenerationStreamEvent, type GenerateRequest, type GenerateResponse } from '../types';

declare const createGenerationStream: any;
declare const GenerationStreamImpl: any;

export type SpyAiServiceMode = 'mock' | 'spy';

export class SpyAiService implements AiServiceClient {
  // TODO(wittjosiah): Factor out signal to higher level?
  private _mode: Signal<SpyAiServiceMode> = signal('spy');
  private _events: GenerationStreamEvent[] = [];

  constructor(private readonly _service: AiServiceClient) {}

  /** @reactive */
  get mode() {
    return this._mode.value;
  }

  get events() {
    return this._events;
  }

  setMode(mode: SpyAiServiceMode): void {
    this._mode.value = mode;
  }

  setEvents(events: GenerationStreamEvent[]): void {
    this._events = events;
  }

  /**
   * Save events to file.
   */
  async saveEvents(): Promise<void> {
    const fileHandle = await window.showSaveFilePicker({
      suggestedName: 'events.json',
      types: [
        {
          description: 'JSON',
          accept: { 'application/json': ['.json'] },
        },
      ],
    });
    const writableStream = await fileHandle.createWritable();
    await writableStream.write(JSON.stringify(this._events));
    await writableStream.close();
  }

  /**
   * Load events from file.
   */
  async loadEvents(): Promise<void> {
    const [fileHandle] = await window.showOpenFilePicker();
    const file = await fileHandle.getFile();
    const events = JSON.parse(await file.text());
    this._events = events;
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
    switch (this._mode.peek()) {
      case 'mock': {
        return createGenerationStream(new Response(createReplaySSEStream(this._events)));
      }
      case 'spy': {
        const stream = await this._service.execStream(request);
        const iterator = async function* (this: SpyAiService) {
          for await (const item of stream) {
            this._events.push(item);
            yield item;
          }
        }.bind(this);

        const controller = new AbortController();
        controller.signal.onabort = () => {
          stream.abort();
        };

        return new GenerationStreamImpl(controller, iterator);
      }
    }
  }
}

export type MockGPTConfig = {
  initDelay?: number;
  minDelay?: number;
  maxDelay?: number;
  errorRate?: number;
  responses?: Record<string, string>;
};

export class MockAiServiceClient implements AiServiceClient {
  private config: Required<MockGPTConfig>;

  constructor(config: MockGPTConfig = {}) {
    this.config = {
      initDelay: config.initDelay ?? 100,
      minDelay: config.minDelay ?? 10,
      maxDelay: config.maxDelay ?? 50,
      errorRate: config.errorRate ?? 0,
      responses: config.responses ?? {
        default: 'This is a mock response that simulates a GPT-like output.',
      },
    };
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
    const controller = new AbortController();
    const block = request.prompt?.blocks[0];
    const prompt = block?._tag === 'text' ? block.text : '';
    const response = this.config.responses[prompt] || this.config.responses.default;
    return new GenerationStreamImpl(controller, () => this.createStream(response, () => {}));
  }

  private async *createStream(response: string, onDone: () => void): AsyncGenerator<GenerationStreamEvent> {
    // Simulate initial API delay.
    await this.delay(this.config.initDelay);

    // Random error simulation.
    if (Math.random() < this.config.errorRate) {
      throw new Error('Mock GPT API error');
    }

    const tokens = this.tokenize(response);

    yield {
      type: 'message_start',
      message: Obj.make(DataType.Message, {
        created: new Date().toISOString(),
        sender: { role: 'assistant' },
        blocks: [],
      }),
    };
    yield {
      type: 'content_block_start',
      index: 0,
      content: { type: 'text', text: '' },
    };
    for (const token of tokens) {
      yield {
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'text_delta', text: token },
      };

      // Simulate token streaming delay.
      await this.delay(this.getRandomDelay());
    }
    yield {
      type: 'content_block_stop',
      index: 0,
    };
    yield {
      type: 'message_stop',
    };

    onDone();
  }

  private *tokenize(text: string): Generator<string> {
    // Simple word-based tokenization for demo.
    const words = text.split(/(\s+|[.,!?])/g);
    for (const word of words) {
      if (word.trim()) {
        yield word;
      } else {
        yield word; // Preserve whitespace.
      }
    }
  }

  private async delay(ms = 0): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private getRandomDelay(): number {
    return Math.random() * (this.config.maxDelay - this.config.minDelay) + this.config.minDelay;
  }
}

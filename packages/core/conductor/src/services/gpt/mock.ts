import type { Context } from 'effect';

import type { GptOutput } from '../gpt';

import type { GptService } from '../gpt';

import { Effect, Stream } from 'effect';
import type { GptInput } from '../gpt';
import { ObjectId, type ResultStreamEvent } from '@dxos/assistant';
import { log } from '@dxos/log';
import type { OutputBag } from '../../schema';
import type G from 'glob';

export type GPTConfig = {
  initDelay?: number;
  minDelay?: number;
  maxDelay?: number;
  errorRate?: number;
  responses?: Record<string, string>;
};

export class MockGpt implements Context.Tag.Service<GptService> {
  private config: Required<GPTConfig>;

  constructor(config: GPTConfig = {}) {
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

  public invoke({ systemPrompt, prompt, history = [] }: GptInput): Effect.Effect<OutputBag<GptOutput>> {
    const self = this;
    return Effect.promise(async () => {
      const response = self.config.responses[prompt] || self.config.responses.default;

      let onDone!: () => void;
      const textResult = new Promise<string>((resolve) => {
        onDone = () => {
          log.info('gpt done', { response });
          resolve(response);
        };
      });

      const tokenStream = Stream.fromAsyncIterable(
        self.createStream(response, onDone),
        (err) => new Error(String(err)),
      );

      return {
        text: Effect.promise(() => textResult),
        messages: [
          {
            id: ObjectId.random(),
            role: 'user',
            content: [{ type: 'text', text: prompt }],
          },
          {
            id: ObjectId.random(),
            role: 'assistant',
            content: [{ type: 'text', text: response }],
          },
        ],
        tokenStream,
        tokenCount: 0,
      } satisfies OutputBag<GptOutput>;
    });
  }

  private async *createStream(response: string, onDone: () => void): AsyncGenerator<ResultStreamEvent> {
    // Simulate initial API delay.
    await this.delay(this.config.initDelay);

    // Random error simulation.
    if (Math.random() < this.config.errorRate) {
      throw new Error('Mock GPT API error');
    }

    const tokens = this.tokenize(response);

    yield {
      type: 'message_start',
      message: {
        id: ObjectId.random(),
        role: 'assistant',
        content: [],
      },
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
    // Simple word-based tokenization for demo
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

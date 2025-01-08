//
// Copyright 2025 DXOS.org
//

import { test } from 'vitest';

export type GPTConfig = {
  initDelay?: number;
  minDelay?: number;
  maxDelay?: number;
  errorRate?: number;
  responses?: Record<string, string>;
};

export type GPTControl = {
  cancel?: boolean;
};

export type GptResult = {
  text: string;
  tokens: number;
};

export type GPTResponse = {
  stream: AsyncGenerator<string, void, GPTControl | undefined>;
  result: Promise<GptResult>;
};

export class MockGPT {
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

  async request(prompt: string): Promise<GPTResponse> {
    const stream = this.createStream(prompt);
    const result = new Promise<GptResult>((resolve, reject) => {});
    return { stream, result };
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

  private async *createStream(prompt: string): AsyncGenerator<string, void, GPTControl | undefined> {
    // Simulate initial API delay.
    await this.delay(this.config.initDelay);

    // Random error simulation.
    if (Math.random() < this.config.errorRate) {
      throw new Error('Mock GPT API error');
    }

    const response = this.config.responses[prompt] || this.config.responses.default;
    const tokens = this.tokenize(response);

    let control: GPTControl | undefined;
    for (const token of tokens) {
      // Check for cancellation.
      if (control?.cancel) {
        return;
      }

      // Simulate token streaming delay.
      await this.delay(this.getRandomDelay());

      // Yield token and get potential control message.
      control = yield token;
    }
  }

  private async delay(ms = 0): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private getRandomDelay(): number {
    return Math.random() * (this.config.maxDelay - this.config.minDelay) + this.config.minDelay;
  }
}

// TODO(burdon): Builder.
interface Node<I = any, O = any> {
  exec(input: I): Promise<O>;
  cancel(): void;
  pipe(result: Node): Node;
  split(result: Record<string, Node>): Node;
  join(nodes: Node[]): Node;
}

const create = (id: string): Node => ({}) as Node;

test('test', async () => {
  const logger = create('logger');

  const pipeline1 = create('p1').split({
    r1: create('p2'),
    r2: create('p3'),
  });

  const pipeline2 = create('p1')
    .split({
      r1: create('p2'),
      r2: create('p3')
        .pipe(create('p4'))
        .split({
          r1: create('p5'),
          r2: create('p6').pipe(logger).pipe(pipeline1),
        }),
    })
    .pipe(create('p7'));

  await pipeline2.exec({ input: 'test' });
  setTimeout(() => pipeline2.cancel(), 1_000);
});

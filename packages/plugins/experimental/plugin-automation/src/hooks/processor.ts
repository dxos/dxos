//
// Copyright 2025 DXOS.org
//

import { type ReadonlySignal, type Signal, computed, signal } from '@preact/signals-core';

import { type PromiseIntentDispatcher } from '@dxos/app-framework';
import { type Tool, Message } from '@dxos/artifact';
import {
  type AIServiceClientImpl,
  type GenerateRequest,
  type GenerationStream,
  isToolUse,
  runTools,
} from '@dxos/assistant';
import { createStatic } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type Space } from '@dxos/react-client/echo';

const defaultOptions: Pick<GenerateRequest, 'model' | 'systemPrompt'> = {
  model: '@anthropic/claude-3-5-sonnet-20241022',
  systemPrompt: '',
};

// TODO(burdon): Factor out.
declare global {
  interface ToolContextExtensions {
    space?: Space;
    dispatch?: PromiseIntentDispatcher;
  }
}

/**
 * Handles interactions with an AI service.
 * Manages message history, and executes tools based on AI responses.
 * Maintains a queue of messages and handles streaming responses from the AI service.
 * Supports cancellation of in-progress requests.
 */
// TODO(burdon): Factor out.
export class ChatProcessor {
  /** Prior history from queue. */
  private _history: Message[] = [];

  /** Pending messages (incl. the initial user message). */
  private _pending: Signal<Message[]> = signal([]);

  /** Streaming messages (from the AI service). */
  private _streaming: Signal<Message[]> = signal([]);

  /** Current streaming response (iterator). */
  private _stream: GenerationStream | undefined;

  constructor(
    private readonly _client: AIServiceClientImpl,
    private readonly _tools?: Tool[],
    private readonly _extensions?: ToolContextExtensions,
    private readonly _options: Pick<GenerateRequest, 'model' | 'systemPrompt'> = defaultOptions,
  ) {}

  get isStreaming(): ReadonlySignal<boolean> {
    return computed(() => this._pending.value.length > 0);
  }

  get messages(): ReadonlySignal<Message[]> {
    return computed(() => [...this._pending.value, ...this._streaming.value]);
  }

  /**
   * Make GPT request.
   */
  async request(message: string, history: Message[] = []): Promise<Message[]> {
    log.info('requesting...', { message, history: history.length });
    this._history = history;
    this._streaming.value = [];
    this._pending.value = [
      createStatic(Message, {
        role: 'user',
        content: [{ type: 'text', text: message }],
      }),
    ];

    await this._generate();
    return this._reset();
  }

  /**
   * Cancel pending requests.
   * @returns Pending requests (incl. the request message).
   */
  async cancel(): Promise<Message[]> {
    log.info('cancelling...');
    this._stream?.abort();
    return this._reset();
  }

  private async _reset(): Promise<Message[]> {
    const pending = this._pending.value;
    this._history = [];
    this._streaming.value = [];
    this._pending.value = [];
    return pending;
  }

  /**
   * Generate a response from the AI service.
   * Iterates over tool requests.
   */
  private async _generate() {
    try {
      let more = false;
      do {
        log.info('requesting...', { history: this._history.length, pending: this._pending.value.length });
        this._stream = await this._client.generate({
          ...this._options,
          // TODO(burdon): Rename messages or separate history/message.
          history: [...this._history, ...this._pending.value],
          tools: this._tools,
        });

        // Consume the stream.
        queueMicrotask(async () => {
          // const parser = new StreamingParser();
          // const blocks: Block[] = [];
          // parser.update.on((block) => {
          //   blocks.push(block);
          //
          //   // TODO(burdon): Convert to message.
          //   this._streaming.value = blocks.map((block) => createStatic(Message, block));
          // });

          invariant(this._stream);
          for await (const event of this._stream) {
            log.info('event', { event: event.type });
            switch (event.type) {
              case 'message_stop': {
                // parser.end();
                break;
              }
            }

            // TODO(burdon): Parse stream.
            this._streaming.value = this._stream.messages.map((message) => createStatic(Message, message));
          }
        });

        // Wait until complete.
        const messages = await this._stream.complete();
        log.info('response', { messages: messages.length });
        this._pending.value.push(...messages.map((message) => createStatic(Message, message)));
        this._streaming.value = [];

        // Resolve tool use locally.
        more = false;
        if (messages.length > 0 && isToolUse(messages.at(-1)!)) {
          log.info('tool request...');
          const response = await runTools({
            message: messages.at(-1)!,
            tools: this._tools ?? [],
            extensions: this._extensions,
          });

          log.info('tool response', { response });
          switch (response.type) {
            case 'continue': {
              this._pending.value.push(response.message);
              more = true;
              break;
            }
          }
        }
      } while (more);
    } catch (err) {
      // TODO(burdon): Handle error.
      log.catch('request failed', { err });
    } finally {
      log.info('done');
      this._stream = undefined;
      this._streaming.value = [];
    }
  }
}

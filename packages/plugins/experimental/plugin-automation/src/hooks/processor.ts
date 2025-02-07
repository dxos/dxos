//
// Copyright 2025 DXOS.org
//

import { type ReadonlySignal, type Signal, computed, signal } from '@preact/signals-core';

import { type PromiseIntentDispatcher } from '@dxos/app-framework';
import { type Tool, Message, type MessageContentBlock } from '@dxos/artifact';
import {
  createMessageBlock,
  isToolUse,
  runTools,
  type AIServiceClientImpl,
  type GenerateRequest,
  type GenerationStream,
  MixedStreamParser,
} from '@dxos/assistant';
import { createStatic, ObjectId } from '@dxos/echo-schema';
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
// TODO(burdon): Rename.
export class ChatProcessor {
  /** Stream parser. */
  private _parser = new MixedStreamParser();

  /** Current streaming response (iterator). */
  private _stream: GenerationStream | undefined;

  /** Prior history from queue. */
  private _history: Message[] = [];

  /** Pending messages (incl. the initial user message). */
  private _messages: Signal<Message[]> = signal([]);

  /** Streaming messages (from the AI service). */
  private _streaming: Signal<MessageContentBlock | undefined> = signal(undefined);

  constructor(
    private readonly _client: AIServiceClientImpl,
    private readonly _tools?: Tool[],
    private readonly _extensions?: ToolContextExtensions,
    private readonly _options: Pick<GenerateRequest, 'model' | 'systemPrompt'> = defaultOptions,
  ) {
    // New message.
    this._parser.message.on(() => {
      const message: Message = {
        id: ObjectId.random(),
        role: 'assistant',
        content: [],
      };

      this._messages.value = [...this._messages.value, message];
      this._streaming.value = undefined;
    });

    // New block.
    this._parser.block.on((block) => {
      log.info('block', { block });
      const messageBlock = createMessageBlock(block);
      if (messageBlock) {
        const message = this._messages.value.at(-1);
        invariant(message);
        message.content.push(messageBlock);
      }
      this._streaming.value = undefined;
    });

    // Streaming update.
    // TODO(burdon): Optional.
    this._parser.update.on((block) => {
      this._streaming.value = createMessageBlock(block);
    });
  }

  get isStreaming(): ReadonlySignal<boolean> {
    return computed(() => !!this._streaming.value);
  }

  get messages(): ReadonlySignal<Message[]> {
    if (this._streaming.value) {
      const messages = this._messages.value.slice(0, -1);
      const current = this._messages.value.at(-1)!;
      const temp: Message = { ...current, content: [...current.content, this._streaming.value] };
      return computed(() => [...messages, temp]);
    } else {
      return this._messages;
    }
  }

  /**
   * Make GPT request.
   */
  async request(message: string, history: Message[] = []): Promise<Message[]> {
    log.info('requesting...', { message, history: history.length });
    this._history = history;
    this._messages.value = [
      createStatic(Message, {
        role: 'user',
        content: [{ type: 'text', text: message }],
      }),
    ];
    this._streaming.value = undefined;

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
    const messages = this._messages.value;
    this._history = [];
    this._messages.value = [];
    this._streaming.value = undefined;
    return messages;
  }

  /**
   * Generate a response from the AI service.
   * Iterates over tool requests.
   */
  private async _generate() {
    try {
      let more = false;
      do {
        log.info('requesting...', { history: this._history.length, pending: this._messages.value.length });
        this._stream = await this._client.generate({
          ...this._options,
          // TODO(burdon): Rename messages or separate history/message.
          history: [...this._history, ...this._messages.value],
          tools: this._tools,
        });

        // Wait until complete.
        await this._parser.parse(this._stream);
        await this._stream.complete();
        this._streaming.value = undefined;

        // Add messages.
        log.info('response', { messages: this._messages.value.length });

        // Resolve tool use locally.
        more = false;
        if (this._messages.value.length > 0 && isToolUse(this._messages.value.at(-1)!)) {
          log.info('tool request...');
          const response = await runTools({
            message: this._messages.value.at(-1)!,
            tools: this._tools ?? [],
            extensions: this._extensions,
          });

          log.info('tool response', { response });
          switch (response.type) {
            case 'continue': {
              this._messages.value = [...this._messages.value, response.message];
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
      this._streaming.value = undefined;
    }
  }
}

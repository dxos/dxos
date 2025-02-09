//
// Copyright 2025 DXOS.org
//

import { type Signal, batch, computed, signal } from '@preact/signals-core';

import { type PromiseIntentDispatcher } from '@dxos/app-framework';
import { type Tool, Message, type MessageContentBlock } from '@dxos/artifact';
import {
  isToolUse,
  runTools,
  type AIServiceClientImpl,
  type GenerateRequest,
  type GenerationStream,
  MixedStreamParser,
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
export class ChatProcessor {
  /** Stream parser. */
  private readonly _parser = new MixedStreamParser();

  /** Pending messages (incl. the user request). */
  private readonly _pending: Signal<Message[]> = signal([]);

  /** Current streaming block (from the AI service). */
  private readonly _block: Signal<MessageContentBlock | undefined> = signal(undefined);

  private readonly _streaming: Signal<boolean> = computed(() => {
    return !!this._block.value;
  });

  /** Messages (incl. the current message). */
  private readonly _messages: Signal<Message[]> = computed(() => {
    const messages = [...this._pending.value];
    const current = messages.pop();
    if (this._block.value) {
      // Add streaming block.
      invariant(current);
      const { content, ...rest } = current;
      const message = { ...rest, content: [...content, this._block.value] };
      messages.push(message);
    }

    return messages;
  });

  /** Current streaming response (iterator). */
  private _stream: GenerationStream | undefined;

  /** Prior history from queue. */
  private _history: Message[] = [];

  constructor(
    private readonly _client: AIServiceClientImpl,
    private readonly _tools?: Tool[],
    private readonly _extensions?: ToolContextExtensions,
    private readonly _options: Pick<GenerateRequest, 'model' | 'systemPrompt'> = defaultOptions,
  ) {
    // Message complete.
    this._parser.message.on((message) => {
      log.info('== MESSAGE ==', { message });
      batch(() => {
        this._pending.value = [...this._pending.value, message];
        this._block.value = undefined;
      });
    });

    // Block complete.
    // this._parser.block.on((block) => {
    //   log.info('== BLOCK ==');
    //   batch(() => {
    //     invariant(this._current.value);
    //     this._block.value = undefined;
    //   });
    // });

    // Streaming update (happens before message complete).
    this._parser.update.on((block) => {
      log.info('== UP ==', { block });
      batch(() => {
        this._block.value = block;
      });
    });
  }

  /**
   * @reactive
   */
  get streaming(): Signal<boolean> {
    return this._streaming;
  }

  /**
   * @reactive
   */
  get messages(): Signal<Message[]> {
    return this._messages;
  }

  /**
   * Make GPT request.
   */
  async request(message: string, history: Message[] = []): Promise<Message[]> {
    batch(() => {
      this._history = history;
      this._pending.value = [
        createStatic(Message, {
          role: 'user',
          content: [{ type: 'text', text: message }],
        }),
      ];
      this._block.value = undefined;
    });

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
    const messages = this._pending.value;
    batch(() => {
      this._history = [];
      this._pending.value = [];
      this._block.value = undefined;
    });

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
        log.info('requesting...', { history: this._history.length, messages: this._pending.value.length });
        this._stream = await this._client.generate({
          ...this._options,
          // TODO(burdon): Rename messages or separate history/message.
          history: [...this._history, ...this._pending.value],
          tools: this._tools,
        });

        // Wait until complete.
        await this._parser.parse(this._stream);
        await this._stream.complete();

        // Add messages.
        log.info('response', { messages: this._pending.value });

        // Resolve tool use locally.
        more = false;
        const message = this._pending.value.at(-1);
        invariant(message);
        if (isToolUse(message)) {
          log.info('tool request...');
          const response = await runTools({
            message: this._pending.value.at(-1)!,
            tools: this._tools ?? [],
            extensions: this._extensions,
          });

          log.info('tool response', { response });
          switch (response.type) {
            case 'continue': {
              this._pending.value = [...this._pending.value, response.message];
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
    }
  }
}

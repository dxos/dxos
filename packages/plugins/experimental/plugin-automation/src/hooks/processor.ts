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

// TODO(burdon): Factor out.
declare global {
  interface ToolContextExtensions {
    space?: Space;
    dispatch?: PromiseIntentDispatcher;
  }
}

type RequestOptions = {
  history?: Message[];
  onComplete?: (messages: Message[]) => void;
};

export type ChatProcessorOptions = Pick<GenerateRequest, 'model' | 'systemPrompt'>;

const defaultOptions: ChatProcessorOptions = {
  model: '@anthropic/claude-3-5-sonnet-20241022',
  systemPrompt: 'you are a helpful assistant',
};

/**
 * Handles interactions with the AI service.
 * Maintains a queue of messages and handles streaming responses from the AI service.
 * Executes tools based on AI responses.
 * Supports cancellation of in-progress requests.
 */
export class ChatProcessor {
  /** SSE stream parser. */
  private readonly _parser = new MixedStreamParser();

  /** Current streaming response (iterator). */
  private _stream: GenerationStream | undefined;

  /** Pending messages (incl. the user request). */
  private readonly _pending: Signal<Message[]> = signal([]);

  /** Current streaming block (from the AI service). */
  private readonly _block: Signal<MessageContentBlock | undefined> = signal(undefined);

  /** Prior history from queue. */
  private _history: Message[] = [];

  /**
   * Streaming state.
   * @reactive
   */
  public readonly streaming: Signal<boolean> = computed(() => this._block.value !== undefined);

  /**
   * Array of Messages (incl. the current message being streamed).
   * @reactive
   */
  public readonly messages: Signal<Message[]> = computed(() => {
    const messages = [...this._pending.value];
    if (this._block.value) {
      const current = messages.pop();
      invariant(current);
      const { content, ...rest } = current;
      const message = { ...rest, content: [...content, this._block.value] };
      messages.push(message);
    }

    return messages;
  });

  constructor(
    private readonly _client: AIServiceClientImpl,
    private _tools?: Tool[],
    private readonly _extensions?: ToolContextExtensions,
    private readonly _options: ChatProcessorOptions = defaultOptions,
  ) {
    // Message complete.
    this._parser.message.on((message) => {
      batch(() => {
        this._pending.value = [...this._pending.value, message];
        this._block.value = undefined;
      });
    });

    // Streaming update (happens before message complete).
    this._parser.update.on((block) => {
      batch(() => {
        this._block.value = block;
      });
    });
  }

  /**
   * Update tools.
   */
  setTools(tools: Tool[]) {
    this._tools = tools;
  }

  /**
   * Make GPT request.
   */
  async request(message: string, options: RequestOptions = {}): Promise<Message[]> {
    batch(() => {
      this._history = options.history ?? [];
      this._pending.value = [
        createStatic(Message, {
          role: 'user',
          content: [{ type: 'text', text: message }],
        }),
      ];
      this._block.value = undefined;
    });

    await this._generate();
    options.onComplete?.(this._pending.value);
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
        log.info('requesting', { history: this._history.length, messages: this._pending.value.length });
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

      log.info('done');
    } catch (err) {
      // TODO(burdon): show error in UI.
      // No error logged if _client.generate throws.
      console.error('ERROR', err);
      log.catch(err);
    } finally {
      this._stream = undefined;
    }
  }
}

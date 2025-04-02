//
// Copyright 2025 DXOS.org
//

import { type Signal, batch, computed, signal } from '@preact/signals-core';

import { type PromiseIntentDispatcher } from '@dxos/app-framework';
import { type ArtifactDefinition, Message, type MessageContentBlock, type Tool } from '@dxos/artifact';
import { type AIServiceClient, AISession, DEFAULT_EDGE_MODEL, type GenerateRequest } from '@dxos/assistant';
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
  model: DEFAULT_EDGE_MODEL,
  systemPrompt: 'you are a helpful assistant',
};

/**
 * Handles interactions with the AI service.
 * Maintains a queue of messages and handles streaming responses from the AI service.
 * Executes tools based on AI responses.
 * Supports cancellation of in-progress requests.
 */
export class ChatProcessor {
  /** Pending messages (incl. the current user request). */
  private readonly _pending: Signal<Message[]> = signal([]);

  /** Current streaming block (from the AI service). */
  private readonly _block: Signal<MessageContentBlock | undefined> = signal(undefined);

  /** Current streaming response. */
  private _session: AISession | undefined;

  /**
   * Streaming state.
   * @reactive
   */
  public readonly streaming: Signal<boolean> = computed(() => this._block.value !== undefined);

  /**
   * Last error.
   * @reactive
   */
  public readonly error: Signal<Error | undefined> = signal(undefined);

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
    private readonly _ai: AIServiceClient,
    private _tools?: Tool[],
    private _artifacts?: ArtifactDefinition[],
    private readonly _extensions?: ToolContextExtensions,
    private readonly _options: ChatProcessorOptions = defaultOptions,
  ) {}

  get tools() {
    return this._tools;
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
    this._session = new AISession({ operationModel: 'immediate' });

    // Message complete.
    this._session.message.on((message) => {
      batch(() => {
        this._pending.value = [...this._pending.value, message];
        this._block.value = undefined;
      });
    });

    // Streaming update (happens before message complete).
    this._session.update.on((block) => {
      batch(() => {
        this._block.value = block;
      });
    });

    this._session.userMessage.on((message) => {
      this._pending.value = [...this._pending.value, message];
    });

    try {
      const messages = await this._session.run({
        client: this._ai,
        history: options.history ?? [],
        artifacts: this._artifacts ?? [],
        tools: this._tools ?? [],
        prompt: message,
        extensions: this._extensions,
        generationOptions: {
          model: this._options.model,
          systemPrompt: this._options.systemPrompt,
        },
      });

      log.info('completed', { messages });

      options.onComplete?.(this._pending.value);
    } catch (err) {
      log.catch(err);
      if (err instanceof Error && err.message.includes('Overloaded')) {
        this.error.value = new AIServiceOverloadedError('AI service overloaded', { cause: err });
      } else {
        this.error.value = new Error('AI service error', { cause: err });
      }
    } finally {
      this._session = undefined;
    }

    return this._reset();
  }

  /**
   * Cancel pending requests.
   * @returns Pending requests (incl. the request message).
   */
  async cancel(): Promise<Message[]> {
    log.info('cancelling...');
    this._session?.abort();
    return this._reset();
  }

  private async _reset(): Promise<Message[]> {
    const messages = this._pending.value;
    batch(() => {
      this._pending.value = [];
      this._block.value = undefined;
    });

    return messages;
  }
}

// TODO(wittjosiah): Move to ai-service-client.
export class AIServiceOverloadedError extends Error {
  code = 'AI_SERVICE_OVERLOADED';
}

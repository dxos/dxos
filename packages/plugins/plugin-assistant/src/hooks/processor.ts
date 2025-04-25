//
// Copyright 2025 DXOS.org
//

import { type Signal, batch, computed, signal } from '@preact/signals-core';

import { type PromiseIntentDispatcher } from '@dxos/app-framework';
import {
  ArtifactId,
  type ArtifactDefinition,
  type Message,
  type MessageContentBlock,
  type TextContentBlock,
  type Tool,
} from '@dxos/artifact';
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
   * Regex to detect proposals in text.
   * @private
   */
  private readonly _proposalRegex = /<proposal>(.*?)<\/proposal>/gs;

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
    private readonly _onProposalProcessed?: (dxn: string, blockIndex: number, content: string) => void,
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

      // Check for proposals in the completed message
      this._checkForProposals(message);
    });

    // Streaming update (happens before message complete).
    this._session.update.on((block) => {
      batch(() => {
        this._block.value = block;
      });

      // For streaming updates, we need to check the current message with the new block
      if (block.type === 'text' && this._pending.value.length > 0) {
        const currentMessage = this._pending.value[this._pending.value.length - 1];

        // Create a temporary message with the current block to check for proposals
        const tempMessage: Message = {
          ...currentMessage,
          content: [block],
        };

        // Check for proposals in the current block
        this._checkForProposals(tempMessage, 0);
      }
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
        systemPrompt: this._options.systemPrompt,
        extensions: this._extensions,
        generationOptions: {
          model: this._options.model,
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

  /**
   * Check for proposals in a message and call the callback if found.
   * @private
   */
  private _checkForProposals(message: Message, blockIndex?: number): void {
    // If no callback is provided and extensions are not available, return
    if (!this._onProposalProcessed) {
      return;
    }

    // Only check messages from the assistant
    if (message.role !== 'assistant') {
      return;
    }

    // Create a DXN for the message
    const messageDxn = message.spaceId && ArtifactId.toDXN(`${message.spaceId}:${message.id}`);
    if (!messageDxn) {
      log.warn('Failed to create DXN for message', { message });
      return;
    }

    // Check each content block for proposals
    const blocks = blockIndex !== undefined ? [message.content[blockIndex]] : message.content;

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const currentBlockIndex = blockIndex !== undefined ? blockIndex : i;

      // Only check text blocks
      if (block.type !== 'text') {
        continue;
      }

      const textBlock = block as TextContentBlock;

      // Check if the text contains proposals
      const proposalMatches = [...textBlock.text.matchAll(this._proposalRegex)];
      if (proposalMatches.length > 0) {
        // Process each proposal
        for (const match of proposalMatches) {
          const proposalContent = match[1];
          log.info('Found proposal', {
            proposalContent,
            messageDxn: messageDxn.toString(),
            blockIndex: currentBlockIndex,
          });

          // If a callback is provided, call it with the DXN, block index, and content
          if (this._onProposalProcessed) {
            this._onProposalProcessed(messageDxn.toString(), currentBlockIndex, proposalContent);
          }
        }
      }
    }
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

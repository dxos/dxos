//
// Copyright 2025 DXOS.org
//

import { type Signal, batch, computed, signal } from '@preact/signals-core';

import {
  DEFAULT_EDGE_MODEL,
  type ExecutableTool,
  type AiServiceClient,
  type GenerateRequest,
  type Message,
  type MessageContentBlock,
  type ToolUseContentBlock,
  ToolRegistry,
} from '@dxos/ai';
import { type PromiseIntentDispatcher } from '@dxos/app-framework';
import { type ArtifactDefinition } from '@dxos/artifact';
import { AISession, type ArtifactDiffResolver, type Blueprint, type BlueprintBinder, type Conversation } from '@dxos/assistant';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { Filter, getVersion, type Live, type Space } from '@dxos/react-client/echo';
import { Context } from '@dxos/context';
import type { Ref } from '@dxos/echo';

// TODO(burdon): Factor out.
declare global {
  interface ToolContextExtensions {
    space?: Space;
    dispatch?: PromiseIntentDispatcher;
  }
}

type RequestOptions = {
  // Empty for now.
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

  /** Current session. */
  private _session: AISession | undefined = undefined;

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
    private readonly _conversation: Conversation,
    private _tools?: ExecutableTool[],
    private _artifacts?: readonly ArtifactDefinition[],
    private readonly _extensions?: ToolContextExtensions,
    private readonly _options: ChatProcessorOptions = defaultOptions,
  ) {}

  get tools() {
    return this._tools;
  }

  /**
   * Binder of active blueprints attached to this coversation.
   */
  get blueprints(): BlueprintBinder {
    return this._conversation.blueprints;
  }

  /**
   * Update tools.
   */
  setTools(tools: ExecutableTool[]): void {
    this._tools = tools;
  }

  /**
   * Make GPT request.
   */
  async request(message: string, options: RequestOptions = {}): Promise<Message[]> {
    await using ctx = Context.default(); // Auto-disposed at the end of this block.

    this._conversation.onBegin.on(ctx, (session) => {
      log.info('onBegin', { session, isDisposed: ctx.disposed });

      this._session = session;
      ctx.onDispose(() => {
        log.info('onDispose', { session, isDisposed: ctx.disposed });
        if (this._session === session) {
          this._session = undefined;
        }
      });

      // Message complete.
      session.message.on((message) => {
        batch(() => {
          this._pending.value = [...this._pending.value, message];
          this._block.value = undefined;
        });
      });

      // Streaming update (happens before message complete).
      session.update.on((block) => {
        batch(() => {
          this._block.value = block;
        });
      });

      session.userMessage.on((message) => {
        log.info('userMessage', { message });
        this._pending.value = [...this._pending.value, message];
      });

      session.toolStatusReport.on(({ message, status }) => {
        const msg = this._pending.peek().find((m) => m.id === message.id);
        const toolUse = msg?.content.find((block) => block.type === 'tool_use');
        if (!toolUse) {
          return;
        }

        const block = msg?.content.find(
          (block): block is ToolUseContentBlock => block.type === 'tool_use' && block.id === toolUse.id,
        );
        if (block) {
          this._pending.value = this._pending.value.map((m) => {
            if (m.id === message.id) {
              return {
                ...m,
                content: m.content.map((b) =>
                  b.type === 'tool_use' && b.id === toolUse.id ? { ...b, currentStatus: status } : b,
                ),
              };
            }
            return m;
          });
        } else {
          log.warn('no block for status report');
        }
      });
    });

    try {
      const messages = await this._conversation.run({
        artifacts: [...(this._artifacts ?? [])],
        requiredArtifactIds: this._artifacts?.map((artifact) => artifact.id) ?? [],

        // TODO(dmaretskyi): Migrate to ToolRegistry.
        executableTools: this._tools ?? [],
        prompt: message,
        systemPrompt: this._options.systemPrompt,
        extensions: this._extensions,
        artifactDiffResolver: this._artifactDiffResolver,
        generationOptions: {
          model: this._options.model,
        },
      });

      log('completed', { messages });
    } catch (err) {
      log.catch(err);
      if (err instanceof Error && err.message.includes('Overloaded')) {
        this.error.value = new AiServiceOverloadedError('AI service overloaded', { cause: err });
      } else {
        this.error.value = new Error('AI service error', { cause: err });
      }
    }
    return this._reset();
  }

  /**
   * Cancel pending requests.
   * @returns Pending requests (incl. the request message).
   */
  async cancel(): Promise<Message[]> {
    log.info('cancelling...');

    // TODO(dmaretskyi): Conversation should handle aborting.
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

  private _artifactDiffResolver: ArtifactDiffResolver = async (artifacts) => {
    const space = this._extensions?.space;
    if (!space) {
      return new Map();
    }
    const versions = new Map();
    await Promise.all(
      artifacts.map(async (artifact) => {
        const {
          objects: [object],
        } = await space.db.query(Filter.ids(artifact.id)).run();
        if (!object) {
          return;
        }
        versions.set(artifact.id, {
          version: getVersion(object),
          diff: `Current state: ${JSON.stringify(object)}`,
        });
      }),
    );
    return versions;
  };
}

// TODO(wittjosiah): Move to ai-service-client.
export class AiServiceOverloadedError extends Error {
  code = 'AI_SERVICE_OVERLOADED';
}

//
// Copyright 2025 DXOS.org
//

import { type Signal, batch, computed, signal } from '@preact/signals-core';
import { Effect, type Layer } from 'effect';

import { AiService, DEFAULT_EDGE_MODEL, type ExecutableTool, type GenerateRequest } from '@dxos/ai';
import { type PromiseIntentDispatcher } from '@dxos/app-framework';
import { type ArtifactDefinition } from '@dxos/artifact';
import {
  type AiSession,
  ArtifactDiffResolver,
  type BlueprintRegistry,
  type ContextBinder,
  type Conversation,
} from '@dxos/assistant';
import { Context } from '@dxos/context';
import { Obj } from '@dxos/echo';
import { runAndForwardErrors } from '@dxos/effect';
import { log } from '@dxos/log';
import { Filter, type Space, getVersion } from '@dxos/react-client/echo';
import { DataType } from '@dxos/schema';

import type { ChatServices } from './useChatServices';

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

export type ChatProcessorOptions = {
  // TODO(burdon): Change to AiToolkit.
  tools?: readonly ExecutableTool[];
  blueprintRegistry?: BlueprintRegistry;

  // TODO(dmaretskyi): Remove.
  artifacts?: readonly ArtifactDefinition[];
  extensions?: ToolContextExtensions;
  // TODO(burdon): Remove systemPrompt -- should come from blueprint.
} & Pick<GenerateRequest, 'model' | 'systemPrompt'>;

const defaultOptions: Partial<ChatProcessorOptions> = {
  model: DEFAULT_EDGE_MODEL,
  systemPrompt: 'you are a helpful assistant',
};

/**
 * Handles interactions with the AI service.
 * Maintains a queue of messages and handles streaming responses from the AI service.
 * Executes tools based on AI responses.
 * Supports cancellation of in-progress requests.
 */
// TODO(burdon): Rename ChatContext?
export class ChatProcessor {
  /**
   * Pending messages (incl. the current user request).
   * @reactive
   */
  private readonly _pending: Signal<DataType.Message[]> = signal([]);

  /**
   * Current streaming message (from the AI service).
   * @reactive
   */
  private readonly _streaming: Signal<DataType.Message | undefined> = signal(undefined);

  /**
   * Streaming state.
   * @reactive
   */
  public readonly streaming: Signal<boolean> = computed(() => this._streaming.value !== undefined);

  /**
   * Last error.
   * @reactive
   */
  public readonly error: Signal<Error | undefined> = signal(undefined);

  /**
   * Array of Messages (incl. the current message being streamed).
   * @reactive
   */
  public readonly messages: Signal<DataType.Message[]> = computed(() => {
    const messages = [...this._pending.value];
    if (this._streaming.value) {
      // TODO(dmaretskyi): Replace with Obj.clone.
      // NOTE: We have to clone the message here so that react will re-render.
      messages.push(Obj.make(DataType.Message, this._streaming.value));
    }

    return messages;
  });

  // TODO(burdon): Replace with Toolkit.
  private _tools?: ExecutableTool[];

  /** Current session. */
  private _session: AiSession | undefined = undefined;

  constructor(
    // TODO(dmaretskyi): Replace this with effect's ManagedRuntime wrapping this layer.
    private readonly _services: Layer.Layer<ChatServices>,
    private readonly _conversation: Conversation,
    private readonly _options: ChatProcessorOptions = defaultOptions,
  ) {
    this._tools = [...(_options.tools ?? [])];
  }

  get conversation() {
    return this._conversation;
  }

  get context(): ContextBinder {
    return this._conversation.context;
  }

  get blueprintRegistry() {
    return this._options.blueprintRegistry;
  }

  get tools() {
    return this._tools;
  }

  /**
   * @deprecated Replace with blueprints
   */
  setTools(tools: ExecutableTool[]): void {
    this._tools = tools;
  }

  /**
   * Make GPT request.
   */
  async request(message: string, options: RequestOptions = {}): Promise<DataType.Message[]> {
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

      // User message.
      session.userMessage.on((message) => {
        log.info('userMessage', { message });
        this._pending.value = [...this._pending.value, message];
      });

      // Message complete.
      session.message.on((message) => {
        batch(() => {
          this._pending.value = [...this._pending.value, message];
          this._streaming.value = undefined;
        });
      });

      // Streaming update (happens before message complete).
      session.update.on((block) => {
        batch(() => {
          if (!this._streaming.value) {
            // TODO(burdon): Hack to create temp message; better for session to send initial partial object?
            this._streaming.value = Obj.make(DataType.Message, {
              created: new Date().toISOString(),
              sender: { role: 'assistant' },
              blocks: [block],
            });
          } else if (this._streaming.value.blocks.at(-1)?.pending === true) {
            this._streaming.value.blocks[this._streaming.value.blocks.length - 1] = block;
          } else {
            this._streaming.value.blocks.push(block);
          }
        });
      });

      session.block.on((block) => {
        if (!this._streaming.value) {
          // TODO(burdon): Hack to create temp message; better for session to send initial partial object?
          this._streaming.value = Obj.make(DataType.Message, {
            created: new Date().toISOString(),
            sender: { role: 'assistant' },
            blocks: [block],
          });
        } else if (this._streaming.value.blocks.at(-1)?.pending === true) {
          this._streaming.value.blocks[this._streaming.value.blocks.length - 1] = block;
        } else {
          this._streaming.value.blocks.push(block);
        }
      });

      // TODO(dmaretskyi): Handle tool status reports.
      // session.toolStatusReport.on(({ message, status }) => {
      //   const msg = this._pending.peek().find((m) => m.id === message.id);
      //   const toolUse = msg?.content.find((block) => block.type === 'tool_use');
      //   if (!toolUse) {
      //     return;
      //   }

      //   const block = msg?.content.find(
      //     (block): block is ToolUseContentBlock => block.type === 'tool_use' && block.id === toolUse.id,
      //   );
      //   if (block) {
      //     this._pending.value = this._pending.value.map((m) => {
      //       if (m.id === message.id) {
      //         return {
      //           ...m,
      //           content: m.content.map((block) =>
      //             block.type === 'tool_use' && block.id === toolUse.id ? { ...block, currentStatus: status } : block,
      //           ),
      //         };
      //       }

      //       return m;
      //     });
      //   } else {
      //     log.warn('no block for status report');
      //   }
      // });
    });

    try {
      const messages = await runAndForwardErrors(
        this._conversation
          .run({
            prompt: message,
            // TODO(burdon): Construct from blueprints?
            systemPrompt: this._options.systemPrompt,
          })
          .pipe(
            //
            Effect.provide(AiService.model(this._options.model ?? DEFAULT_EDGE_MODEL)),
            // TODO(dmaretskyi): Move ArtifactDiffResolver upstream.
            Effect.provideService(ArtifactDiffResolver, this._artifactDiffResolver),
            Effect.provide(this._services),
            Effect.tapErrorCause((cause) => {
              log.error('error', { cause });
              return Effect.void;
            }),
          ),
      );

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
  async cancel(): Promise<DataType.Message[]> {
    log.info('cancelling...');

    // TODO(dmaretskyi): Conversation should handle aborting.
    this._session?.abort();
    return this._reset();
  }

  private async _reset(): Promise<DataType.Message[]> {
    const messages = this._pending.value;
    batch(() => {
      this._pending.value = [];
      this._streaming.value = undefined;
    });

    return messages;
  }

  private _artifactDiffResolver: ArtifactDiffResolver.Service = {
    resolve: async (artifacts) => {
      const space = this._options.extensions?.space;
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
    },
  };
}

// TODO(wittjosiah): Move to ai-service-client.
export class AiServiceOverloadedError extends Error {
  code = 'AI_SERVICE_OVERLOADED';
}

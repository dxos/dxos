//
// Copyright 2025 DXOS.org
//

import { Registry, Result, Rx } from '@effect-rx/rx-react';
import { Effect, type Layer, Option, Stream, pipe } from 'effect';

import { AiService, DEFAULT_EDGE_MODEL, type LLMModel } from '@dxos/ai';
import { type PromiseIntentDispatcher } from '@dxos/app-framework';
import {
  type AiConversation,
  type AiConversationRunParams,
  AiSession,
  ArtifactDiffResolver,
} from '@dxos/assistant';
import { type Blueprint } from '@dxos/blueprints';
import { Context } from '@dxos/context';
import { Obj } from '@dxos/echo';
import { runAndForwardErrors } from '@dxos/effect';
import { log } from '@dxos/log';
import { Filter, type Space, getVersion } from '@dxos/react-client/echo';
import { type ContentBlock, DataType } from '@dxos/schema';

import { AiServiceOverloadedError } from './errors';
import { type AiChatServices } from './useChatServices';

// TODO(burdon): Is this still used?
declare global {
  interface ToolContextExtensions {
    space?: Space;
    dispatch?: PromiseIntentDispatcher;
  }
}

export type AiRequestOptions = {
  // Empty for now.
};

export type AiChatProcessorOptions = {
  model?: LLMModel;
  blueprintRegistry?: Blueprint.Registry;
  registry?: Registry.Registry;
  extensions?: ToolContextExtensions;
} & Pick<AiConversationRunParams<any>, 'system'>;

const defaultOptions: Partial<AiChatProcessorOptions> = {
  model: DEFAULT_EDGE_MODEL,
  system: 'you are a helpful assistant',
};

/**
 * Handles interactions with the AI service.
 * Maintains a queue of messages and handles streaming responses from the AI service.
 * Executes tools based on AI responses.
 * Supports cancellation of in-progress requests.
 */
export class AiChatProcessor {
  /**
   * Last error.
   */
  // TODO(wittjosiah): Error should come from the message stream.
  readonly error = Rx.make<Option.Option<Error>>(Option.none());;
  private readonly _registry = this._options.registry ?? Registry.make()

  /** Current session. */
  private readonly _session = Rx.make<Option.Option<AiSession>>(Option.none());

  /**
   * Current streaming message (from the AI service).
   */
  private readonly _streaming: Rx.Rx<Result.Result<Option.Option<DataType.Message>, Error>> = Rx.make((get) => {
    return pipe(
      get(this._session),
      Option.map((session) => Stream.fromQueue(session.blockQueue)),
      Option.getOrElse(() => Stream.make()),
      Stream.scan<Option.Option<DataType.Message>, Option.Option<ContentBlock.Any>>(Option.none(), (acc, blockOption) =>
        Option.flatMap(blockOption, (block) =>
          acc.pipe(
            Option.match({
              onNone: () => [block],
              onSome: (message) => [...message.blocks.filter((b) => !b.pending), block],
            }),
            Option.some,
            Option.map((blocks) =>
              Obj.make(DataType.Message, {
                created: new Date().toISOString(),
                sender: { role: 'assistant' },
                blocks,
              }),
            ),
          ),
        ),
      ),
    );
  });

  /**
   * Streaming state.
   */
  readonly streaming: Rx.Rx<boolean> = Rx.make((get) => {
    return pipe(
      get(this._streaming),
      Result.map((streaming) => Option.isSome(streaming)),
      Result.getOrElse(() => false),
    );
  });

  /**
   * Pending messages (incl. the current user request).
   */
  private readonly _pending: Rx.Rx<Result.Result<DataType.Message[], Error>> = Rx.make((get) => {
    // TODO(wittjosiah): For some reason using Option.map here loses reactivity.
    const session = get(this._session);
    return Option.isSome(session)
      ? pipe(
          session.value.messageQueue,
          Stream.fromQueue,
          Stream.scan<DataType.Message[], DataType.Message>([], (acc, message) => [...acc, message]),
        )
      : Stream.make();
  });

  /**
   * Array of Messages (incl. the current message being streamed).
   */
  readonly messages: Rx.Rx<Result.Result<DataType.Message[], Error>> = Rx.make((get) => {
    const streaming = get(this._streaming);
    return Result.map(get(this._pending), (pending) =>
      Result.match(streaming, {
        onInitial: () => pending,
        onSuccess: (streaming) =>
          Option.match(streaming.value, {
            onNone: () => pending,
            onSome: (message) => [...pending, message],
          }),
        onFailure: () => pending,
      }),
    );
  });

  constructor(
    // TODO(dmaretskyi): Replace this with effect's ManagedRuntime wrapping this layer.
    private readonly _services: Layer.Layer<AiChatServices>,
    private readonly _conversation: AiConversation,
    private readonly _options: AiChatProcessorOptions = defaultOptions,
  ) {}

  get context() {
    return this._conversation.context;
  }

  get conversation() {
    return this._conversation;
  }

  get blueprintRegistry() {
    return this._options.blueprintRegistry;
  }

  /**
   * Make GPT request.
   */
  async request(message: string, _options: AiRequestOptions = {}): Promise<void> {
    await using ctx = Context.default(); // Auto-disposed at the end of this block.

    const session = new AiSession();
    this._registry.set(this._session, Option.some(session));

    ctx.onDispose(() => {
      log.info('onDispose', { session, isDisposed: ctx.disposed });
      Option.match(this._registry.get(this._session), {
        onSome: (s) => {
          if (s === session) {
            this._registry.set(this._session, Option.none());
          }
        },
        onNone: () => {},
      });
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

    try {
      const messages = await runAndForwardErrors(
        this._conversation
          .run({
            session,
            prompt: message,
            system: this._options.system,
          })
          .pipe(
            //
            Effect.provide(AiService.AiService.model(this._options.model ?? DEFAULT_EDGE_MODEL)),
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
        this._registry.set(
          this.error,
          Option.some(new AiServiceOverloadedError('AI service overloaded', { cause: err })),
        );
      } else {
        this._registry.set(this.error, Option.some(new Error('AI service error', { cause: err })));
      }
    }
  }

  /**
   * Cancel pending requests.
   */
  async cancel(): Promise<void> {
    log.info('cancelling...');

    // TODO(dmaretskyi): Conversation should handle aborting.
    Option.match(this._registry.get(this._session), {
      onSome: (session) => {
        session.abort();
        this._registry.set(this._session, Option.none());
      },
      onNone: () => {},
    });
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

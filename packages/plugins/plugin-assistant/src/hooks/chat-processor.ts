//
// Copyright 2025 DXOS.org
//

import { Registry, Result, Rx } from '@effect-rx/rx-react';
import { Cause, Effect, Exit, Fiber, type Layer, Option, Stream, pipe } from 'effect';

import { AiService, DEFAULT_EDGE_MODEL, type ModelName, type ModelRegistry } from '@dxos/ai';
import {
  type AiConversation,
  type AiConversationRunParams,
  AiSession,
  ArtifactDiffResolver,
  createSystemPrompt,
} from '@dxos/assistant';
import { type Blueprint } from '@dxos/blueprints';
import { Context } from '@dxos/context';
import { Obj } from '@dxos/echo';
import { runAndForwardErrors, throwCause } from '@dxos/effect';
import { log } from '@dxos/log';
import { Filter, getVersion } from '@dxos/react-client/echo';
import { type ContentBlock, DataType } from '@dxos/schema';
import { trim } from '@dxos/util';

import { type Assistant } from '../types';

import { type AiChatServices } from './useChatServices';

// TODO(burdon): Move to @dxos/assistant
const CHAT_NAME_PROMPT = trim`
  Suggest a single short title for this chat.
  It is extermely important that you respond only with the title and nothing else.
  If you cannot do this effectively respond with "New Chat".
`;

export type AiRequestOptions = {};

export type AiChatProcessorOptions = {
  model?: ModelName;
  modelRegistry?: ModelRegistry;
  blueprintRegistry?: Blueprint.Registry;
  observableRegistry?: Registry.Registry;
  extensions?: ToolContextExtensions;
} & Pick<AiConversationRunParams<any>, 'system'>;

export type AiRequest = {
  message: string;
  options?: AiRequestOptions;
};

const defaultOptions: Partial<AiChatProcessorOptions> = {
  model: DEFAULT_EDGE_MODEL,
};

/**
 * Handles interactions with the AI service.
 * Maintains a queue of messages and handles streaming responses from the AI service.
 * Executes tools based on AI responses.
 * Supports cancellation of in-progress requests.
 */
export class AiChatProcessor {
  /** Last error. */
  // TODO(wittjosiah): Error should come from the message stream.
  public readonly error = Rx.make<Option.Option<Error>>(Option.none());

  /** Rx registry. */
  private readonly _observableRegistry: Registry.Registry;

  /** Current session. */
  private readonly _session = Rx.make<Option.Option<AiSession>>(Option.none());

  /** Current request fiber. */
  private _currentRequest?: Fiber.Fiber<void, any> = undefined;

  /** Last request for retries. */
  private _lastRequest?: AiRequest;

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
  ) {
    // Initialize registries and defaults before using in other logic.
    this._observableRegistry = this._options.observableRegistry ?? Registry.make();
    if (this._options.model && !this._options.system) {
      const capabilities = this._options.modelRegistry?.getCapabilities(this._options.model) ?? {};
      this._options.system = createSystemPrompt(capabilities);
    }
  }

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
   * Retry last request.
   */
  async retry(): Promise<void> {
    if (this._lastRequest) {
      return this.request(this._lastRequest);
    }
  }

  /**
   * Make GPT request.
   */
  async request(request: AiRequest): Promise<void> {
    if (this._currentRequest) {
      throw new Error('Request already in progress');
    }

    // TODO(burdon): Retain session for retry?
    const session = new AiSession();
    this._observableRegistry.set(this._session, Option.some(session));
    this._lastRequest = request;

    await using ctx = Context.default(); // Auto-disposed at the end of this block.
    ctx.onDispose(() => {
      log.info('onDispose', { session, isDisposed: ctx.disposed });
      Option.match(this._observableRegistry.get(this._session), {
        onNone: () => {},
        onSome: (s) => {
          if (s === session) {
            this._observableRegistry.set(this._session, Option.none());
          }
        },
      });
    });

    try {
      this._observableRegistry.set(this.error, Option.none());
      this._currentRequest = this._conversation
        .run({
          session,
          prompt: request.message,
          system: this._options.system,
        })
        .pipe(
          Effect.provide(AiService.model(this._options.model ?? DEFAULT_EDGE_MODEL)),
          // TODO(dmaretskyi): Move ArtifactDiffResolver upstream.
          Effect.provideService(ArtifactDiffResolver, this._artifactDiffResolver),
          Effect.provide(this._services),
          Effect.tapErrorCause((cause) => {
            log.error('error', { cause });
            return Effect.void;
          }),
          Effect.asVoid,
          Effect.runFork,
        );

      const exit = await this._currentRequest.pipe(Fiber.join, Effect.runPromiseExit);
      if (!Exit.isSuccess(exit) && !Cause.isInterruptedOnly(exit.cause)) {
        throwCause(exit.cause);
      }
    } catch (err) {
      log.catch(err);
      this._observableRegistry.set(this.error, Option.some(new Error('AI service error', { cause: err })));
    } finally {
      this._currentRequest = undefined;
    }
  }

  /**
   * Cancel pending requests.
   */
  // TODO(burdon): Populate prompt.
  async cancel(): Promise<void> {
    log.info('cancelling...');
    if (this._currentRequest) {
      await this._currentRequest.pipe(Fiber.interrupt, runAndForwardErrors);
      this._currentRequest = undefined;
    }

    this._observableRegistry.set(this._session, Option.none());
  }

  /**
   * Update the current chat's name;
   */
  async updateName(chat: Assistant.Chat): Promise<void> {
    // TODO(burdon): Select a simple/quick/cheap model for this.
    const request = this._conversation
      .raw({
        session: new AiSession(),
        prompt: CHAT_NAME_PROMPT,
      })
      .pipe(
        // @effect-diagnostics-next-line multipleEffectProvide:off
        Effect.provide(AiService.model(this._options.model ?? DEFAULT_EDGE_MODEL)),
        Effect.provide(this._services),
        Effect.tap((message) => {
          const title = message?.blocks.find((b) => b._tag === 'text')?.text;
          chat.name = title;
        }),
        Effect.tapErrorCause((cause) => {
          log.error('error', { cause });
          return Effect.void;
        }),
        Effect.asVoid,
        Effect.runFork,
      );

    const exit = await request.pipe(Fiber.join, Effect.runPromiseExit);
    if (!Exit.isSuccess(exit) && !Cause.isInterruptedOnly(exit.cause)) {
      throwCause(exit.cause);
    }
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

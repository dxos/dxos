//
// Copyright 2025 DXOS.org
//

import { type AiTool } from '@effect/ai';
import { Registry, Result, Rx } from '@effect-rx/rx-react';
import { Cause, Effect, Exit, Fiber, Layer, Option, Stream, pipe } from 'effect';

import {
  AiService,
  DEFAULT_EDGE_MODEL,
  type ModelName,
  type ModelRegistry,
  type ToolExecutionService,
  type ToolResolverService,
} from '@dxos/ai';
import { type PromiseIntentDispatcher } from '@dxos/app-framework';
import {
  type AiConversation,
  type AiConversationRunParams,
  AiSession,
  type AiSessionRequest,
  ArtifactDiffResolver,
  createSystemPrompt,
} from '@dxos/assistant';
import { type Blueprint } from '@dxos/blueprints';
import { Context } from '@dxos/context';
import { Obj } from '@dxos/echo';
import { runAndForwardErrors, throwCause } from '@dxos/effect';
import {
  type CredentialsService,
  type DatabaseService,
  type QueueService,
  type RemoteFunctionExecutionService,
  type TracingService,
} from '@dxos/functions';
import { log } from '@dxos/log';
import { Filter, type Space, getVersion } from '@dxos/react-client/echo';
import { type ContentBlock, DataType } from '@dxos/schema';
import { trim } from '@dxos/util';

import { type Assistant } from '../types';

// TODO(burdon): Standardize/remove?
declare global {
  interface ToolContextExtensions {
    space?: Space;
    dispatch?: PromiseIntentDispatcher;
  }
}

export type AiChatServices =
  | CredentialsService
  | DatabaseService
  | QueueService
  | RemoteFunctionExecutionService
  | AiService.AiService
  | ToolExecutionService
  | ToolResolverService
  | TracingService;

export type AiChatProcessorOptions = {
  model?: ModelName;
  modelRegistry?: ModelRegistry;
  blueprintRegistry?: Blueprint.Registry;
  observableRegistry?: Registry.Registry;
  extensions?: ToolContextExtensions;
} & Pick<AiConversationRunParams<any>, 'system'>;

const defaultOptions: Partial<AiChatProcessorOptions> = {
  model: DEFAULT_EDGE_MODEL,
};

// TODO(burdon): Retry, timeout?
export type AiRequestOptions = {};

export type AiRequest = {
  message: string;
  options?: AiRequestOptions;
};

/**
 * Handles interactions with the AI service.
 * Handles streaming responses from the conversation.
 */
export class AiChatProcessor {
  // TODO(burdon): Comment required.
  private readonly _observableRegistry: Registry.Registry;

  /** Currently active request. */
  private _request: AiSessionRequest<AiTool.Any> | undefined;

  /** Last request for retries. */
  private _lastRequest: AiRequest | undefined;

  /** @deprecated */
  private _currentRequest?: Fiber.Fiber<void, any> = undefined;

  /** Current session. */
  private readonly _session = Rx.make<Option.Option<AiSession>>(Option.none());

  /**
   * Current streaming message (from the AI service).
   */
  // TODO(burdon): Move util into @dxos/assistant (e.g., AiConversationRequest)?
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
              onSome: (message) => [...message.blocks.filter((block) => !block.pending), block],
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
   * Streaming state.
   */
  public readonly streaming: Rx.Rx<boolean> = Rx.make((get) => {
    return pipe(
      get(this._streaming),
      Result.map((streaming) => Option.isSome(streaming)),
      Result.getOrElse(() => false),
    );
  });

  /**
   * Array of Messages (incl. the current message being streamed).
   */
  public readonly messages: Rx.Rx<Result.Result<DataType.Message[], Error>> = Rx.make((get) => {
    const streaming = get(this._streaming);
    return Result.map(get(this._pending), (pending) =>
      Result.match(streaming, {
        onInitial: () => pending,
        onFailure: () => pending,
        onSuccess: (streaming) =>
          Option.match(streaming.value, {
            onNone: () => pending,
            onSome: (message) => [...pending, message],
          }),
      }),
    );
  });

  /** Last error. */
  // TODO(wittjosiah): Error should come from the message stream.
  public readonly error = Rx.make<Option.Option<Error>>(Option.none());

  constructor(
    private readonly _conversation: AiConversation,
    // TODO(dmaretskyi): Replace this with effect's ManagedRuntime wrapping this layer.
    private readonly _services: Layer.Layer<AiChatServices>,
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
   * Initiates a new request.
   */
  async request(requestParam: AiRequest): Promise<void> {
    if (this._request) {
      await this.cancel();
    }

    try {
      this._lastRequest = requestParam;
      this._request = this._conversation.createRequest({
        system: this._options.system,
        prompt: requestParam.message,
      });

      this._observableRegistry.set(this._session, Option.some(this._request.session));
      this._observableRegistry.set(this.error, Option.none());

      await this._request.run(
        Layer.provideMerge(AiService.model(this._options.model ?? DEFAULT_EDGE_MODEL), this._services),
      );

      this._observableRegistry.set(this.error, Option.none());
      this._lastRequest = undefined;
    } catch (err) {
      log.error('request failed', { err });
      this._observableRegistry.set(this.error, Option.some(new Error('AI service error', { cause: err })));
    } finally {
      this._observableRegistry.set(this._session, Option.none());
      this._request = undefined;
    }
  }

  /**
   * Cancels the current request.
   */
  async cancel(): Promise<void> {
    await this._request?.cancel();
    this._observableRegistry.set(this._session, Option.none());
    this._request = undefined;
  }

  /**
   * Retry last failed request.
   */
  async retry(): Promise<void> {
    if (this._lastRequest) {
      return this.request(this._lastRequest);
    }
  }

  /**
   * @deprecated
   */
  async _oldRequest(request: AiRequest): Promise<void> {
    if (this._currentRequest) {
      throw new Error('Request already in progress');
    }

    const session = new AiSession();
    this._observableRegistry.set(this._session, Option.some(session));
    this._observableRegistry.set(this.error, Option.none());
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
      this._lastRequest = request;
      this._currentRequest = this._conversation
        .exec({
          session,
          prompt: request.message,
          system: this._options.system,
        })
        .pipe(
          Effect.provide(
            Layer.provideMerge(AiService.model(this._options.model ?? DEFAULT_EDGE_MODEL), this._services),
          ),

          // TODO(burdon): What is this for???
          // TODO(dmaretskyi): Move ArtifactDiffResolver upstream.
          Effect.provideService(ArtifactDiffResolver, this._artifactDiffResolver),

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
   * @deprecated
   */
  async _oldCancel(): Promise<void> {
    log.info('cancelling...');
    if (this._currentRequest) {
      await this._currentRequest.pipe(Fiber.interrupt, runAndForwardErrors);
      this._currentRequest = undefined;
    }

    this._observableRegistry.set(this._session, Option.none());
  }

  /**
   * Update the current chat's name.
   */
  async updateName(chat: Assistant.Chat): Promise<void> {
    const prompt = trim`
      Suggest a single short title for this chat.
      It is extremely important that you respond only with the title and nothing else.
      If you cannot do this effectively respond with "New Chat".
    `;

    const history = await this._conversation.getHistory();
    const fiber = Effect.gen(this, function* () {
      const session = new AiSession();
      return yield* session.run({ prompt, history });
    }).pipe(
      // TODO(burdon): Use simpler model.
      Effect.provide(Layer.provideMerge(AiService.model(this._options.model ?? DEFAULT_EDGE_MODEL), this._services)),
      Effect.tap((messages) => {
        const message = messages.find((message) => message.sender.role === 'assistant');
        const title = message?.blocks.find((b) => b._tag === 'text')?.text;
        if (title) {
          chat.name = title;
        }
      }),
      Effect.runFork, // Run in the background.
    );

    const response = await fiber.pipe(Fiber.join, Effect.runPromiseExit);
    if (!Exit.isSuccess(response)) {
      throwCause(response.cause);
    }
  }

  // TODO(burdon): Document.
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

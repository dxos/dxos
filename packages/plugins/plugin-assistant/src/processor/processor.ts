//
// Copyright 2025 DXOS.org
//

import { Registry, Rx } from '@effect-rx/rx-react';
import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Fiber from 'effect/Fiber';
import * as Option from 'effect/Option';
import * as Runtime from 'effect/Runtime';

import {
  AiService,
  DEFAULT_EDGE_MODEL,
  type ModelName,
  type ModelRegistry,
  type ToolExecutionService,
  type ToolResolverService,
} from '@dxos/ai';
import {
  type AiConversation,
  type AiConversationRunParams,
  AiSession,
  ArtifactDiffResolver,
  GenerationObserver,
  createSystemPrompt,
} from '@dxos/assistant';
import { type Blueprint } from '@dxos/blueprints';
import { Obj } from '@dxos/echo';
import { throwCause } from '@dxos/effect';
import {
  type CredentialsService,
  type DatabaseService,
  type FunctionInvocationService,
  type QueueService,
  type TracingService,
} from '@dxos/functions';
import { log } from '@dxos/log';
import { type ContentBlock, DataType } from '@dxos/schema';
import { trim } from '@dxos/util';

import { type Assistant } from '../types';

export type AiChatServices =
  | CredentialsService
  | DatabaseService
  | QueueService
  | FunctionInvocationService
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
} & Pick<AiConversationRunParams, 'system'>;

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
  private readonly _rx: Registry.Registry;

  /** External observer. */
  private readonly _observer: GenerationObserver;

  /** Currently active request fiber. */
  private _fiber: Fiber.Fiber<void, any> | undefined;

  /** Last request (for retries). */
  private _lastRequest: AiRequest | undefined;

  /** Pending messages (incl. the current user request). */
  private readonly _pending = Rx.make<DataType.Message[]>([]);

  /** Currently streaming message (from the AI service). */
  private readonly _streaming = Rx.make<Option.Option<DataType.Message>>(Option.none());

  /** Streaming state. */
  public readonly streaming = Rx.make<boolean>((get) => Option.isSome(get(this._streaming)));

  /** Active state. */
  public readonly active = Rx.make(false);

  /** Array of Messages (incl. the current message being streamed). */
  public readonly messages = Rx.make<DataType.Message[]>((get) =>
    Option.match(get(this._streaming), {
      onNone: () => get(this._pending),
      onSome: (streaming) => [...get(this._pending), streaming],
    }),
  );

  /** Last error. */
  public readonly error = Rx.make<Option.Option<Error>>(Option.none());

  constructor(
    private readonly _conversation: AiConversation,
    // TODO(dmaretskyi): Replace this with effect's ManagedRuntime wrapping this layer.
    private readonly _services: () => Promise<Runtime.Runtime<AiChatServices>>,
    private readonly _options: AiChatProcessorOptions = defaultOptions,
  ) {
    // Initialize registries and defaults before using in other logic.
    this._rx = this._options.observableRegistry ?? Registry.make();
    this._observer = GenerationObserver.make({
      onBlock: this._onBlock,
      onMessage: this._onMessage,
    });
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
    if (this._fiber) {
      await this.cancel();
    }

    try {
      this._lastRequest = requestParam;
      this._rx.set(this.error, Option.none());
      this._rx.set(this.active, true);

      // Create request.
      const request = this._conversation.createRequest({
        system: this._options.system,
        prompt: requestParam.message,
        observer: this._observer,
      });

      const runtime = await this._services();

      // Create fiber.
      this._fiber = request.pipe(
        Effect.provide(AiService.model(this._options.model ?? DEFAULT_EDGE_MODEL)),

        // TODO(dmaretskyi): Move ArtifactDiffResolver upstream.
        Effect.provideService(ArtifactDiffResolver, this._artifactDiffResolver),

        Effect.asVoid,
        Runtime.runFork(runtime), // Runs in the background.
      );

      // Execute request.
      const response = await this._fiber.pipe(Fiber.join, Effect.runPromiseExit);
      if (!Exit.isSuccess(response) && !Cause.isInterruptedOnly(response.cause)) {
        throwCause(response.cause);
      }

      this._rx.set(this.error, Option.none());
      this._lastRequest = undefined;
      this._fiber = undefined;
    } catch (error) {
      log.error('request failed', { error });
      this._rx.set(this.error, Option.some(new Error('AI service error', { cause: error })));
    } finally {
      this._fiber = undefined;
      this._rx.set(this.active, false);
    }
  }

  /**
   * Cancels the current request.
   */
  async cancel(): Promise<void> {
    await Effect.runPromise(
      Effect.gen(this, function* () {
        if (this._fiber) {
          yield* this._fiber.pipe(Fiber.interrupt);
        }
      }),
    );

    this._fiber = undefined;
    this._rx.set(this.active, false);
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
   * Update the current chat's name.
   */
  async updateName(chat: Assistant.Chat): Promise<void> {
    const runtime = await this._services();

    const system = trim`
      It is extremely important that you respond only with the title and nothing else.
      If you cannot do this effectively respond with "New Chat".
    `;

    const history = await this._conversation.getHistory();
    const fiber = Effect.gen(this, function* () {
      const session = new AiSession();
      return yield* session.run({ system, prompt: 'Suggest a name for this chat', history });
    }).pipe(
      // TODO(burdon): Use simpler model.
      Effect.provide(AiService.model(this._options.model ?? DEFAULT_EDGE_MODEL)),
      Effect.tap((messages) => {
        const message = messages.find((message) => message.sender.role === 'assistant');
        const title = message?.blocks.find((b) => b._tag === 'text')?.text;
        if (title) {
          chat.name = title;
        }
      }),
      Runtime.runFork(runtime), // Run in the background.
    );

    const response = await fiber.pipe(Fiber.join, Effect.runPromiseExit);
    if (!Exit.isSuccess(response)) {
      throwCause(response.cause);
    }
  }

  // TODO(burdon): Fix/factor out.
  private _artifactDiffResolver: ArtifactDiffResolver.Service = {
    resolve: async (_artifacts) => {
      const versions = new Map();
      // await Promise.all(
      //   artifacts.map(async (artifact) => {
      //     const {
      //       objects: [object],
      //     } = await space.db.query(Filter.ids(artifact.id)).run();
      //     if (!object) {
      //       return;
      //     }

      //     versions.set(artifact.id, {
      //       version: getVersion(object),
      //       diff: `Current state: ${JSON.stringify(object)}`,
      //     });
      //   }),
      // );

      return versions;
    },
  };

  private _onMessage = Effect.fn(
    function* (this: AiChatProcessor, message: DataType.Message) {
      this._rx.set(this._streaming, Option.none());
      this._rx.update(this._pending, (pending) => [...pending, message]);
    }.bind(this),
  );

  private _onBlock = Effect.fn(
    function* (this: AiChatProcessor, block: ContentBlock.Any) {
      this._rx.update(this._streaming, (streaming) => {
        const blocks = streaming.pipe(
          Option.map((streaming) => streaming.blocks.filter((b) => !b.pending)),
          Option.getOrElse(() => []),
        );

        return Option.some(
          Obj.make(DataType.Message, {
            created: new Date().toISOString(),
            sender: { role: 'assistant' },
            blocks: [...blocks, block],
          }),
        );
      });
    }.bind(this),
  );
}

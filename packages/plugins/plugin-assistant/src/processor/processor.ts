//
// Copyright 2025 DXOS.org
//

import { Atom, Registry } from '@effect-atom/atom-react';
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
  type AiConversationRunProps,
  ArtifactDiffResolver,
  GenerationObserver,
  createSystemPrompt,
} from '@dxos/assistant';
import { type Blueprint } from '@dxos/blueprints';
import { Obj } from '@dxos/echo';
import { type Database } from '@dxos/echo';
import { runAndForwardErrors, throwCause } from '@dxos/effect';
import {
  type CredentialsService,
  type FunctionInvocationService,
  type QueueService,
  type TracingService,
} from '@dxos/functions';
import { log } from '@dxos/log';
import { type ContentBlock, Message } from '@dxos/types';

import { type Assistant } from '../types';

import { updateName } from './update-name';

export type AiChatServices =
  | CredentialsService
  | Database.Service
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
} & Pick<AiConversationRunProps, 'system'>;

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
  private readonly _registry: Registry.Registry;

  /** External observer. */
  private readonly _observer: GenerationObserver;

  /** Pending messages (incl. the current user request). */
  private readonly _pending = Atom.make<Message.Message[]>([]);

  /** Currently streaming message (from the AI service). */
  private readonly _streaming = Atom.make<Option.Option<Message.Message>>(Option.none());

  /** Currently active request fiber. */
  private _fiber: Fiber.Fiber<void, any> | undefined;

  /** Last request (for retries). */
  private _lastRequest: AiRequest | undefined;

  /** Streaming state. */
  public readonly streaming = Atom.make<boolean>((get) => Option.isSome(get(this._streaming)));

  /** Active state. */
  public readonly active = Atom.make(false);

  /** Array of Messages (incl. the current message being streamed). */
  public readonly messages = Atom.make<Message.Message[]>((get) =>
    Option.match(get(this._streaming), {
      onNone: () => get(this._pending),
      onSome: (streaming) => [...get(this._pending), streaming],
    }),
  );

  /** Last error. */
  public readonly error = Atom.make<Option.Option<Error>>(Option.none());

  constructor(
    private readonly _conversation: AiConversation,
    // TODO(dmaretskyi): Replace this with effect's ManagedRuntime wrapping this layer.
    private readonly _services: () => Promise<Runtime.Runtime<AiChatServices>>,
    private readonly _options: AiChatProcessorOptions = defaultOptions,
  ) {
    // Initialize registries and defaults before using in other logic.
    this._registry = this._options.observableRegistry ?? Registry.make();
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
  async request(requestProp: AiRequest): Promise<void> {
    if (this._fiber) {
      await this.cancel();
    }

    try {
      this._lastRequest = requestProp;
      this._registry.set(this.error, Option.none());
      this._registry.set(this.active, true);

      const services = await this._services();

      // Create request.
      const request = this._conversation.createRequest({
        system: this._options.system,
        prompt: requestProp.message,
        observer: this._observer,
      });

      // Create fiber.
      this._fiber = request.pipe(
        Effect.provide(AiService.model(this._options.model ?? DEFAULT_EDGE_MODEL)),
        // TODO(dmaretskyi): Move ArtifactDiffResolver upstream.
        Effect.provideService(ArtifactDiffResolver, this._artifactDiffResolver),
        Effect.asVoid,
        Runtime.runFork(services), // Runs in the background.
      );

      // Execute request.
      const response = await this._fiber.pipe(Fiber.join, Effect.runPromiseExit);
      if (!Exit.isSuccess(response) && !Cause.isInterruptedOnly(response.cause)) {
        throwCause(response.cause);
      }

      this._registry.set(this.error, Option.none());
      this._lastRequest = undefined;
      this._fiber = undefined;
    } catch (err) {
      log.error('request failed', { error: err });
      this._registry.set(this.error, Option.some(new Error('AI service error', { cause: err })));
    } finally {
      this._registry.set(this.active, false);
      this._fiber = undefined;
    }
  }

  /**
   * Cancels the current request.
   */
  async cancel(): Promise<void> {
    await runAndForwardErrors(
      Effect.gen(this, function* () {
        if (this._fiber) {
          yield* this._fiber.pipe(Fiber.interrupt);
        }
      }),
    );

    this._fiber = undefined;
    this._registry.set(this.active, false);
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
    await updateName(runtime, this._conversation, chat, this._options.model);
  }

  // TODO(burdon): Fix/factor out.
  private _artifactDiffResolver: ArtifactDiffResolver.Service = {
    resolve: async (_artifacts) => {
      const versions = new Map();
      // await Promise.all(
      //   artifacts.map(async (artifact) => {
      //     const {
      //       objects: [object],
      //     } = await space.db.query(Filter.id(artifact.id)).run();
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
    function* (this: AiChatProcessor, message: Message.Message) {
      this._registry.set(this._streaming, Option.none());
      this._registry.update(this._pending, (pending) => [...pending, message]);
    }.bind(this),
  );

  private _onBlock = Effect.fn(
    function* (this: AiChatProcessor, block: ContentBlock.Any) {
      this._registry.update(this._streaming, (streaming) => {
        const blocks = streaming.pipe(
          Option.map((streaming) => streaming.blocks.filter((b: ContentBlock.Any) => !b.pending)),
          Option.getOrElse(() => []),
        );

        return Option.some(
          Obj.make(Message.Message, {
            created: new Date().toISOString(),
            sender: { role: 'assistant' },
            blocks: [...blocks, block],
          }),
        );
      });
    }.bind(this),
  );
}

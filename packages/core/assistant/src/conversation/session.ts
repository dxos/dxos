//
// Copyright 2025 DXOS.org
//

import type { Registry } from '@effect-atom/atom-react';
import * as Array from 'effect/Array';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Either from 'effect/Either';
import { pipe } from 'effect/Function';
import * as Layer from 'effect/Layer';
import * as Record from 'effect/Record';
import * as Runtime from 'effect/Runtime';

import { type OpaqueToolkit, type ToolExecutionService, type ToolResolverService } from '@dxos/ai';
import { type Blueprint } from '@dxos/compute';
import { Resource } from '@dxos/context';
import { Database, Feed, Filter, Obj } from '@dxos/echo';
import { acquireReleaseResource } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { McpToolkit } from '@dxos/mcp-client';
import { Operation, type OperationRegistry } from '@dxos/compute';
import { Message } from '@dxos/types';

import { ToolExecutionServices } from '../functions';
import {
  AiRequest,
  type AiRequestRunError,
  type AiRequestRunRequirements,
  type GenerationObserver,
  createToolkit,
  formatSystemPrompt,
} from '../session';
import { AiContextBinder, AiContextService } from './context';

export interface McpServerConfig {
  url: string;
  protocol: 'sse' | 'http';
  apiKey?: string;
}

export interface AiSessionRunProps<R = never> {
  prompt: string;
  system?: string;
  observer?: GenerationObserver;
  toolkit?: OpaqueToolkit.OpaqueToolkit<R>;

  /**
   * Space-level MCP servers to connect alongside blueprint-defined ones.
   */
  mcpServers?: readonly McpServerConfig[];
}

export type AiSessionOptions = {
  feed: Feed.Feed;
  runtime: Runtime.Runtime<Feed.FeedService>;
  registry?: Registry.Registry;
};

// TODO(dmaretskyi): Take from model characteristics. opus has 200k max tokens.
/**
 * Summarization threshold in tokens.
 */
const SUMMARY_THRESHOLD = 80_000;

/**
 * Durable conversation state (initiated by users and agents) backed by a Feed.
 * Executes tools based on AI responses and supports cancellation of in-progress requests.
 */
export class AiSession extends Resource {
  /**
   * Blueprints and objects bound to the conversation.
   */
  private readonly _binder: AiContextBinder;
  private readonly _feed: Feed.Feed;
  private readonly _runtime: Runtime.Runtime<Feed.FeedService>;

  public constructor(options: AiSessionOptions) {
    super();
    this._feed = options.feed;
    this._runtime = options.runtime;
    invariant(this._feed);
    invariant(this._runtime);
    this._binder = new AiContextBinder({ feed: this._feed, runtime: this._runtime, registry: options.registry });
  }

  protected override async _open(): Promise<void> {
    await this._binder.open(this._ctx);
  }

  public get feed() {
    return this._feed;
  }

  public get context() {
    return this._binder;
  }

  public async getHistory(): Promise<Message.Message[]> {
    const queryResult = await Runtime.runPromise(this._runtime)(Feed.query(this._feed, Filter.type(Message.Message)));
    const items = await queryResult.run();
    return items.filter(Obj.instanceOf(Message.Message));
  }

  getTools(): Effect.Effect<
    Record<string, import('@effect/ai/Tool').Any>,
    never,
    ToolExecutionService | ToolResolverService
  > {
    return Effect.gen(this, function* () {
      const toolkit = yield* createToolkit({ blueprints: this.context.getBlueprints() });
      return toolkit.toolkit.tools;
    }).pipe(Effect.orDie);
  }

  /**
   * Not provided by default, since users might want to override them.
   */
  makeToolExecutionServices(): Layer.Layer<
    ToolExecutionService | ToolResolverService,
    never,
    OpaqueToolkit.OpaqueToolkitProvider | Operation.Service | OperationRegistry.Service
  > {
    return ToolExecutionServices.pipe(
      Layer.provide(Operation.withInvocationOptions({ conversation: Obj.getDXN(this._feed).toString() })),
    );
  }
  /**
   * Creates a new cancelable request effect.
   */
  public createRequest<R = never>(
    params: AiSessionRunProps<R>,
  ): Effect.Effect<Message.Message[], AiRequestRunError, AiRequestRunRequirements | R> {
    return Effect.gen(this, function* () {
      const history = yield* Effect.promise(() => this.getHistory());
      const blueprints = this.context.getBlueprints();
      const objects = this.context.getObjects();

      log('run', {
        history: history.length,
        blueprints: blueprints.length,
        objects: objects.length,
      });

      const request = new AiRequest({
        summarizationThreshold: SUMMARY_THRESHOLD,
        observer: params.observer,
        onOutput: (message) =>
          Effect.promise(() => Runtime.runPromise(this._runtime)(Feed.append(this._feed, [message]))),
      });

      yield* request.begin({
        history,
        blueprints,
        objects,
        prompt: params.prompt,
        system: params.system,
      });

      // Turn loop: recompute toolkit and system prompt between turns to pick up dynamically enabled blueprints.
      do {
        yield* Effect.promise(() => this.context.sync());
        const currentBlueprints = this.context.getBlueprints();
        const mcps = yield* connectMcpServers(currentBlueprints, params.mcpServers);
        const toolkit = yield* createToolkit({
          toolkit: params.toolkit,
          blueprints: currentBlueprints,
          opaqueToolkits: mcps,
        });

        log('toolkit', { tools: Record.keys(toolkit.toolkit.tools) });
        const system = yield* formatSystemPrompt({
          system: params.system,
          blueprints: currentBlueprints,
          objects: this.context.getObjects(),
        }).pipe(Effect.orDie);

        const { done } = yield* request.runAgentTurn({ system, toolkit });
        if (done) {
          break;
        }

        yield* request.runTools({ toolkit });
      } while (true);

      log('result', {
        messages: request.pending.length,
        duration: request.duration,
        toolCalls: request.toolCalls,
      });

      return [...request.pending];
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          Layer.succeed(AiContextService, {
            binder: this.context,
          }),
          Layer.succeed(AiSessionService, this),
          Operation.withInvocationOptions({ conversation: Obj.getDXN(this._feed).toString() }),
        ),
      ),
      Effect.withSpan('AiSession.createRequest'),
    );
  }
}

/**
 * Gives access to the ai session.
 */
export class AiSessionService extends Context.Tag('@dxos/assistant/AiSessionService')<AiSessionService, AiSession>() {
  /**
   * Create a new session layer from options.
   */
  static layer = (options: AiSessionOptions): Layer.Layer<AiSessionService | AiContextService> =>
    aiContextFromSession.pipe(
      Layer.provideMerge(
        Layer.scoped(
          AiSessionService,
          Effect.gen(function* () {
            const session = yield* acquireReleaseResource(() => new AiSession(options));
            return session;
          }),
        ),
      ),
    );

  /**
   * Create a new session with a new feed.
   */
  static layerNewFeed = (
    options?: Omit<AiSessionOptions, 'feed' | 'runtime'>,
  ): Layer.Layer<AiSessionService | AiContextService, never, Database.Service | Feed.FeedService> =>
    Layer.unwrapScoped(
      Effect.gen(function* () {
        const feed = Feed.make();
        yield* Database.add(feed);
        const runtime = yield* Effect.runtime<Feed.FeedService>();
        return AiSessionService.layer({
          ...options,
          feed,
          runtime,
        });
      }),
    );

  /**
   * Run a prompt in the current session.
   */
  static run = <R = never>(
    params: AiSessionRunProps<R>,
  ): Effect.Effect<Message.Message[], AiRequestRunError, AiRequestRunRequirements | AiSessionService | R> =>
    Effect.gen(function* () {
      const session = yield* AiSessionService;
      return yield* session.createRequest(params);
    });
}

const aiContextFromSession = Layer.effect(
  AiContextService,
  Effect.gen(function* () {
    const session = yield* AiSessionService;
    return {
      binder: session.context,
    };
  }),
);

const connectMcpServers = (
  blueprints: readonly Blueprint.Blueprint[],
  spaceMcpServers: readonly McpServerConfig[] = [],
): Effect.Effect<OpaqueToolkit.OpaqueToolkit[]> => {
  const blueprintServers: McpToolkit.McpToolkitOptions[] = pipe(
    blueprints,
    Array.flatMap((_) => _.mcpServers ?? []),
    Array.map(({ url, protocol }) => ({ url, kind: protocol })),
  );
  const spaceServers: McpToolkit.McpToolkitOptions[] = spaceMcpServers.map(({ url, protocol, apiKey }) => ({
    url,
    kind: protocol,
    apiKey,
  }));
  const allServers = [...blueprintServers, ...spaceServers];

  return pipe(
    allServers,
    Effect.forEach((options) =>
      McpToolkit.make(options).pipe(
        // NOTE: Type-inference fails here without explicit void return.
        Effect.tap((toolkit): void =>
          log.info('Connected to MCP server', { url: options.url, tools: Object.keys(toolkit.toolkit.tools).length }),
        ),
        Effect.tapDefect((error) => Effect.sync(() => log.warn('Failed to connect to MCP server', { error }))),
        Effect.either,
      ),
    ),
    Effect.map(Array.filterMap((_) => Either.getRight(_))),
  );
};

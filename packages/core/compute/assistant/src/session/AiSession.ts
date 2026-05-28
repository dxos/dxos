//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { type Registry } from '@effect-atom/atom-react';
import * as Array from 'effect/Array';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Either from 'effect/Either';
import { pipe } from 'effect/Function';
import * as Layer from 'effect/Layer';
import * as Record from 'effect/Record';
import * as Runtime from 'effect/Runtime';

import { type OpaqueToolkit, type ToolExecutionService, type ToolResolverService } from '@dxos/ai';
import { type Blueprint, type OperationRegistry, McpServer, Operation, Trace } from '@dxos/compute';
import { Resource } from '@dxos/context';
import { Database, Feed, Filter, Obj } from '@dxos/echo';
import { acquireReleaseResource } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { McpToolkit } from '@dxos/mcp-client';
import { Message, type ContentBlock } from '@dxos/types';

import { ToolExecutionServices } from '../functions';
import { AiRequest, type GenerationObserver, formatSystemPrompt } from '../request';
import { McpServerError } from '../util';
import * as AiContext from './AiContext';
import { SessionLoader } from './SessionLoader';
import { createToolkit } from './toolkit';

export type RunProps<R = never> = {
  prompt: string | ContentBlock.Any[];
  system?: string;
  observer?: GenerationObserver;
  toolkit?: OpaqueToolkit.OpaqueToolkit<R>;

  /**
   * Space-level MCP servers to connect alongside blueprint-defined ones.
   */
  mcpServers?: readonly McpServer.McpServer[];
};

export type Options = {
  feed: Feed.Feed;
  runtime: Runtime.Runtime<Feed.FeedService>;
  registry?: Registry.Registry;
};

/**
 * Summarization threshold in tokens.
 */
// TODO(dmaretskyi): Take from model characteristics. opus has 200k max tokens.
const SUMMARY_THRESHOLD = 80_000;

/**
 * Durable conversation state (initiated by users and agents) backed by a Feed.
 * Executes tools based on AI responses and supports cancellation of in-progress requests.
 */
export class Session extends Resource {
  /**
   * Blueprints and objects bound to the session.
   */
  private readonly _binder: AiContext.Binder;
  private readonly _feed: Feed.Feed;
  private readonly _runtime: Runtime.Runtime<Feed.FeedService>;
  private readonly _sessionLoader = new SessionLoader();

  public constructor(options: Options) {
    super();
    this._feed = options.feed;
    this._runtime = options.runtime;
    invariant(this._feed);
    invariant(this._runtime);
    this._binder = new AiContext.Binder({
      feed: this._feed,
      runtime: this._runtime,
      registry: options.registry,
    });
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
    const messages = items.filter(Obj.instanceOf(Message.Message));
    return Runtime.runPromise(this._runtime)(this._sessionLoader.reifyHistory(messages));
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
      Layer.provide(Operation.withInvocationOptions({ conversation: Obj.getURI(this._feed) })),
    );
  }

  /**
   * Creates a new cancelable request effect.
   */
  public createRequest<R = never>(
    params: RunProps<R>,
  ): Effect.Effect<Message.Message[], AiRequest.RunError, AiRequest.RunRequirements | R> {
    return Effect.gen(this, function* () {
      const history = yield* Effect.promise(() => this.getHistory());
      const blueprints = this.context.getBlueprints();
      const objects = this.context.getObjects();

      log('run', {
        history: history.length,
        blueprints: blueprints.length,
        objects: objects.length,
      });

      const request = new AiRequest.Request({
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
          Layer.succeed(AiContext.Service, {
            binder: this.context,
          }),
          Layer.succeed(Service, this),
          Operation.withInvocationOptions({ conversation: Obj.getURI(this._feed) }),
        ),
      ),
      Effect.withSpan('AiSession.createRequest'),
    );
  }
}

/**
 * Gives access to the ai session.
 */
export class Service extends Context.Tag('@dxos/assistant/AiSessionService')<Service, Session>() {
  /**
   * Create a new session layer from options.
   */
  static layer = (options: Options): Layer.Layer<Service | AiContext.Service> =>
    aiContextFromSession.pipe(
      Layer.provideMerge(
        Layer.scoped(
          Service,
          Effect.gen(function* () {
            const session = yield* acquireReleaseResource(() => new Session(options));
            return session;
          }),
        ),
      ),
    );

  /**
   * Create a new session with a new feed.
   */
  static layerNewFeed = (
    options?: Omit<Options, 'feed' | 'runtime'>,
  ): Layer.Layer<Service | AiContext.Service, never, Database.Service | Feed.FeedService> =>
    Layer.unwrapScoped(
      Effect.gen(function* () {
        const feed = yield* Database.add(Feed.make());
        const runtime = yield* Effect.runtime<Feed.FeedService>();
        return Service.layer({ ...options, feed, runtime });
      }),
    );

  /**
   * Run a prompt in the current session.
   */
  static run = <R = never>(
    params: RunProps<R>,
  ): Effect.Effect<Message.Message[], AiRequest.RunError, AiRequest.RunRequirements | Service | R> =>
    Effect.gen(function* () {
      const session = yield* Service;
      return yield* session.createRequest(params);
    });
}

const aiContextFromSession = Layer.effect(
  AiContext.Service,
  Effect.gen(function* () {
    const session = yield* Service;
    return {
      binder: session.context,
    };
  }),
);

const connectMcpServers = (
  blueprints: readonly Blueprint.Blueprint[],
  spaceMcpServers: readonly McpServer.McpServer[] = [],
): Effect.Effect<OpaqueToolkit.OpaqueToolkit[], never, Trace.TraceService> => {
  const blueprintServers: McpToolkit.McpToolkitOptions[] = pipe(
    blueprints,
    Array.flatMap((_) => _.mcpServers ?? []),
    Array.map(({ url, protocol, apiKey }) => ({ url, protocol, apiKey })),
  );
  const spaceServers: McpToolkit.McpToolkitOptions[] = spaceMcpServers.map(({ url, protocol, apiKey }) => ({
    url,
    protocol,
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
        // Surface typed connection failures via ephemeral trace + warn log, then drop the server.
        Effect.tapError((error) =>
          Effect.gen(function* () {
            log.warn('Failed to connect to MCP server', {
              url: error.url,
              protocol: error.protocol,
              message: error.message,
            });
            yield* Trace.write(McpServerError, {
              url: error.url,
              protocol: error.protocol,
              message: error.message,
            });
          }),
        ),
        // Catch unexpected defects too (e.g. malformed tool schemas) so a single broken
        // server can never abort the whole turn — surface them through the same channel.
        Effect.catchAllDefect((defect) =>
          Effect.gen(function* () {
            const message = defect instanceof Error ? defect.message : String(defect);
            log.warn('Unexpected MCP defect', { url: options.url, message });
            yield* Trace.write(McpServerError, {
              url: options.url,
              protocol: options.protocol,
              message: `Unexpected MCP failure: ${message}`,
            });
            return yield* Effect.fail(
              new McpToolkit.McpConnectionError({
                url: options.url,
                protocol: options.protocol,
                message,
              }),
            );
          }),
        ),
        Effect.either,
      ),
    ),
    Effect.map(Array.filterMap((_) => Either.getRight(_))),
  );
};

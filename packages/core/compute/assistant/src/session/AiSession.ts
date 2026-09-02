//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Array from 'effect/Array';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import { pipe } from 'effect/Function';
import * as Layer from 'effect/Layer';
import * as Order from 'effect/Order';
import * as Record from 'effect/Record';
import type * as Tool from 'effect/unstable/ai/Tool';
import type * as AtomRegistry from 'effect/unstable/reactivity/AtomRegistry';

import { type OpaqueToolkit, type ToolExecutionService, type ToolResolverService } from '@dxos/ai';
import type * as Instructions from '@dxos/compute/Instructions';
import * as McpServer from '@dxos/compute/McpServer';
import * as Operation from '@dxos/compute/Operation';
import type * as Skill from '@dxos/compute/Skill';
import * as Trace from '@dxos/compute/Trace';
import { Resource } from '@dxos/context';
import { Database, Feed, Filter, Obj, Registry } from '@dxos/echo';
import { RuntimeProvider } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { McpToolkit } from '@dxos/mcp-client';
import { FeedProtocol } from '@dxos/protocols';
import { type ContentBlock, Message } from '@dxos/types';

import { AiRequest, type GenerationObserver, formatSystemPrompt } from '../request';
import { ToolExecutionServices } from '../tool-runtime';
import { McpServerError } from '../util';
import * as AiContext from './AiContext';
import * as Harness from './Harness';
import { SessionStore } from './SessionStore';
import * as SkillHooks from './SkillHooks';
import { createToolkit } from './toolkit';

export type RunProps<R = never> = {
  prompt: string | ContentBlock.Any[];
  system?: string;
  observer?: GenerationObserver;
  toolkit?: OpaqueToolkit.OpaqueToolkit<R>;

  /**
   * Space-level MCP servers to connect alongside skill-defined ones.
   */
  mcpServers?: readonly McpServer.McpServer[];

  /**
   * When false, messages from this request are not appended to the feed or persisted to trace.
   *
   * @default true
   */
  persist?: boolean;
};

export type Options = {
  feed: Feed.Feed;
  runtime: Context.Context<Database.Service>;
  /** @effect/atom-react Registry for reactive state. */
  registry?: AtomRegistry.AtomRegistry;
  /**
   * Instructions steering the conversation (typically the owning `Chat`'s), rendered into the system
   * prompt on every turn. The session is feed-centric and cannot reach its chat, so these are passed in.
   */
  instructions?: readonly Instructions.Instructions[];
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
  private readonly _feed: Feed.Feed;
  private readonly _runtime: Context.Context<Database.Service>;
  readonly #instructions: readonly Instructions.Instructions[];

  /**
   * Skills and objects bound to the session.
   */
  private readonly _binder: AiContext.Binder;

  private readonly _sessionStore = new SessionStore();

  public constructor(options: Options) {
    super();
    this._feed = options.feed;
    this._runtime = options.runtime;
    this.#instructions = options.instructions ?? [];
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

  /**
   * The conversation as the model should see it: only the messages reachable from the feed's current
   * head, so a soft fork's abandoned turns are excluded.
   */
  public async getHistory(): Promise<Message.Message[]> {
    const { items: reachable } = Feed.history(await this.#messagesInAppendOrder());
    return RuntimeProvider.runPromise(Effect.succeed(this._runtime))(
      this._sessionStore.reifyHistory(this._feed, reachable),
    );
  }

  /**
   * Every message in the feed, in append order — what `Feed.history` needs, since it walks lineage
   * positionally rather than by `created`, a wall clock peers do not agree on.
   */
  async #messagesInAppendOrder(): Promise<Message.Message[]> {
    const queryResult = await RuntimeProvider.runPromise(Effect.succeed(this._runtime))(
      Feed.query(this._feed, Filter.type(Message.Message)),
    );
    const items = await queryResult.run();
    return Array.sort(items.filter(Obj.instanceOf(Message.Message)), byFeedPosition);
  }

  getTools(): Effect.Effect<Record<string, Tool.Any>, never, ToolExecutionService | ToolResolverService> {
    return Effect.gen({ self: this }, function* () {
      const toolkit = yield* createToolkit({ skills: this.context.getSkills() });
      return toolkit.toolkit.tools;
    }).pipe(Effect.orDie);
  }

  /**
   * Not provided by default, since users might want to override them.
   */
  makeToolExecutionServices(): Layer.Layer<
    ToolExecutionService | ToolResolverService,
    never,
    OpaqueToolkit.OpaqueToolkitProvider | Operation.Service | Registry.Service
  > {
    return ToolExecutionServices.pipe(
      Layer.provide(Operation.withInvocationOptions({ conversation: Obj.getURI(this._feed) })),
    );
  }

  /**
   * Appends one of this turn's messages to the feed, consuming a pending rewind if there is one.
   *
   * The rewind decision is made in the UI, but the continuation is appended by the agent's process,
   * which resolves the feed and never sees the chat — so the feed carries the intent and this is where
   * it becomes lineage. `rewindFrom` names the earliest discarded message, so the new parent is whatever
   * precedes it; nothing preceding means the continuation starts a fresh line. Only the first message of
   * a turn finds it set, since the append clears it, so the rest of the turn chains implicitly. Clearing
   * after the append (rather than before) leaves the rewind pending if the turn fails.
   */
  public async appendTurnMessage(message: Message.Message): Promise<void> {
    const rewindFrom = this._feed.rewindFrom;
    const parent = rewindFrom !== undefined ? await this.#parentForRewind(rewindFrom) : undefined;

    return RuntimeProvider.runPromise(Effect.succeed(this._runtime))(
      Effect.gen({ self: this }, function* () {
        yield* Feed.append(this._feed, [message], parent !== undefined ? { parent } : undefined);
        if (rewindFrom !== undefined) {
          Obj.update(this._feed, (feed) => {
            feed.rewindFrom = undefined;
          });
        }
      }),
    );
  }

  /** The message preceding `rewindFrom` in append order, which the continuation parents to. */
  async #parentForRewind(rewindFrom: string): Promise<string | undefined> {
    const messages = await this.#messagesInAppendOrder();
    const index = messages.findIndex((message) => message.id === rewindFrom);
    return index > 0 ? messages[index - 1].id : undefined;
  }

  /**
   * Creates a new cancelable request effect.
   */
  public createRequest<R = never>(
    params: RunProps<R>,
  ): Effect.Effect<Message.Message[], AiRequest.RunError, AiRequest.RunRequirements | R> {
    return Effect.gen({ self: this }, function* () {
      const history = yield* Effect.promise(() => this.getHistory());
      const skills = this.context.getSkills();
      const objects = this.context.getObjects();

      log('run', {
        history: history.length,
        skills: skills.length,
        objects: objects.length,
      });

      const request = new AiRequest.Request({
        summarizationThreshold: SUMMARY_THRESHOLD,
        observer: params.observer,
        persist: params.persist,
        onOutput: (message) => Effect.promise(() => this.appendTurnMessage(message)),
      });

      yield* request.begin({
        history,
        skills,
        objects,
        instructions: this.#instructions,
        prompt: params.prompt,
        system: params.system,
      });

      // Fire begin-request hooks declared by the bound skills. These run in the agent's turn
      // fiber (Tier A only), so they cannot reach the live host (Tier B) — that is the end hook's job.
      yield* SkillHooks.runHooks({
        skills,
        phase: 'begin-request',
        invoke: (operation, input) => Operation.invoke(operation, input).pipe(Effect.asVoid, Effect.orDie),
      });

      // Turn loop: recompute toolkit and system prompt between turns to pick up dynamically enabled skills.
      do {
        yield* Effect.promise(() => this.context.sync());
        const currentSkills = this.context.getSkills();
        const mcps = yield* connectMcpServers(currentSkills, params.mcpServers);
        const toolkit = yield* createToolkit({
          toolkit: params.toolkit,
          skills: currentSkills,
          opaqueToolkits: mcps,
        });

        log('toolkit', { tools: Record.keys(toolkit.toolkit.tools) });
        const system = yield* formatSystemPrompt({
          system: params.system,
          skills: currentSkills,
          objects: this.context.getObjects(),
          instructions: this.#instructions,
        }).pipe(Effect.orDie);

        const { done, finishReason } = yield* request.runAgentTurn({ system, toolkit });
        if (done) {
          break;
        }
        // A paused server-tool turn (e.g. Anthropic `pause_turn`) resumes with another request and
        // no local tool execution; the trailing server tool call must be left intact for the provider.
        if (finishReason === 'pause') {
          continue;
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
          // Tier A only: the agent's own turn fiber has no `ProcessManager.Service` in scope, so
          // Tier B (setAlarm/enqueueMessage) is reachable only by child operations through the
          // process-affinity HarnessService LayerSpec — not from here.
          Layer.succeed(
            Harness.HarnessService,
            Harness.fromBinder({ feed: this._feed, runtime: this._runtime, binder: this.context }),
          ),
          Operation.withInvocationOptions({ conversation: Obj.getURI(this._feed) }),
        ),
      ),
      Effect.withSpan('AiSession.createRequest'),
    );
  }
}

const connectMcpServers = (
  skills: readonly Skill.Skill[],
  spaceMcpServers: readonly McpServer.McpServer[] = [],
): Effect.Effect<OpaqueToolkit.OpaqueToolkit[], never, Trace.TraceService> => {
  const skillServers: McpToolkit.McpToolkitOptions[] = pipe(
    skills,
    Array.flatMap((_) => _.mcpServers ?? []),
    Array.map(({ url, protocol, apiKey }) => ({ url, protocol, apiKey })),
  );
  const spaceServers: McpToolkit.McpToolkitOptions[] = spaceMcpServers.map(({ url, protocol, apiKey }) => ({
    url,
    protocol,
    apiKey,
  }));
  const allServers = [...skillServers, ...spaceServers];

  return pipe(
    allServers,
    Effect.forEach((options) =>
      McpToolkit.make(options).pipe(
        // NOTE: Type-inference fails here without explicit void return.
        Effect.tap((toolkit) =>
          Effect.sync(() =>
            log.info('Connected to MCP server', { url: options.url, tools: Object.keys(toolkit.toolkit.tools).length }),
          ),
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
        Effect.catchDefect((defect) =>
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
        Effect.result,
      ),
    ),
    Effect.map((results) => Array.filterMap(results, (result) => result)),
  );
};

/**
 * Orders feed items by the position the server assigned them. Unpositioned blocks (written locally and
 * not yet acknowledged) sort last, which is what we want: a message just written is the newest.
 */
const byFeedPosition = Order.make<Message.Message>((a, b) => {
  const positionA = feedPosition(a);
  const positionB = feedPosition(b);
  return positionA === positionB ? 0 : positionA < positionB ? -1 : 1;
});

const feedPosition = (message: Message.Message): number => {
  const key = Obj.getKeys(message, FeedProtocol.KEY_QUEUE_POSITION).at(0)?.id;
  const position = key !== undefined ? Number(key) : Number.NaN;
  return Number.isNaN(position) ? Number.POSITIVE_INFINITY : position;
};

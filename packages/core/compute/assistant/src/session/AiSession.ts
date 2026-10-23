//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import type * as Tool from 'effect/ai/Tool';
import * as Array from 'effect/Array';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import { pipe } from 'effect/Function';
import * as Layer from 'effect/Layer';
import type * as AtomRegistry from 'effect/reactivity/AtomRegistry';
import * as Record from 'effect/Record';
import type * as Scope from 'effect/Scope';

import { AiTelemetry, OpaqueToolkit, type ToolExecutionService, type ToolResolverService } from '@dxos/ai';
import type * as Instructions from '@dxos/compute/Instructions';
import * as Operation from '@dxos/compute/Operation';
import type * as Skill from '@dxos/compute/Skill';
import * as Trace from '@dxos/compute/Trace';
import { Resource } from '@dxos/context';
import { Database, Feed, Obj, Registry } from '@dxos/echo';
import * as RuntimeProvider from '@dxos/effect/RuntimeProvider';
import { invariant } from '@dxos/invariant';
import { EID } from '@dxos/keys';
import { log } from '@dxos/log';
import { McpToolkit } from '@dxos/mcp-client';
import { Trajectory } from '@dxos/trajectory';
import { type ContentBlock, Message } from '@dxos/types';
import { markWork } from '@dxos/util';

import { AiRequest, type GenerationObserver, formatSystemPrompt } from '../request/index.ts';
import { ToolExecutionServices } from '../tool-runtime/index.ts';
import * as AiContext from './AiContext.ts';
import * as Harness from './Harness.ts';
import * as Legacy from './Legacy.ts';
import * as SkillHooks from './SkillHooks.ts';
import * as ThreadToolkit from './thread-toolkit.ts';
import { createToolkit } from './toolkit.ts';
import * as TrajectoryStore from './TrajectoryStore.ts';

export type RunProps<R = never> = {
  prompt: string | ContentBlock.Any[];
  /** Who the prompt is from, when not the session's reader (e.g. one of several people in a shared agent chat). */
  sender?: Message.Message['sender'];
  system?: string;
  observer?: GenerationObserver;
  toolkit?: OpaqueToolkit.OpaqueToolkit<R>;

  /**
   * Space-level MCP servers to connect alongside skill-defined ones.
   */
  mcpServers?: readonly McpToolkit.Options[];

  /**
   * When false, messages from this request are not appended to the feed or persisted to trace.
   *
   * @default true
   */
  persist?: boolean;

  /**
   * The queued record this turn answers. Its content is already in the feed, so the turn consumes it (a message) or
   * fires it (an alarm) rather than appending the prompt as a new message.
   */
  source?: TurnSource;

  /** Model the turn runs on, recorded on its `turnBegin`. */
  model?: Trajectory.TurnBegin['model'];

  /**
   * The light thread the turn runs in (`TrajectoryStore.openLightThread`); absent for main. Its history is the
   * thread's prompt, and it gets the tools for waiting on the threads beside it.
   */
  thread?: Trajectory.EventId;

  /**
   * Whether the turn may delegate to subagents (`thread_delegate`), which run in background threads; set by a host
   * that schedules lanes. Turns that may delegate also get `thread_wait`.
   */
  delegation?: boolean;
};

export type TurnSource = TrajectoryStore.TurnSource;

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
    return RuntimeProvider.runPromise(Effect.succeed(this._runtime))(TrajectoryStore.history(this._feed));
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
   * Appends one of the current turn's messages to the feed, in the turn's thread when one is open.
   */
  public async appendTurnMessage(message: Message.Message): Promise<void> {
    await RuntimeProvider.runPromise(Effect.succeed(this._runtime))(
      TrajectoryStore.append(this._feed, [toEvent(message, this.#turn)]),
    );
  }

  /**
   * Records a rewind the UI left on the feed (`rewindFrom`, the first discarded message) as a `rewind` event and
   * clears it, so the next turn continues from what precedes it.
   */
  applyPendingRewind(): Effect.Effect<void, never, Database.Service> {
    return Effect.gen({ self: this }, function* () {
      const rewindFrom = this._feed.rewindFrom;
      if (rewindFrom === undefined) {
        return;
      }
      yield* TrajectoryStore.append(this._feed, [
        Trajectory.make({ payload: { _tag: 'rewind', from: rewindFrom }, sender: { role: 'user' } }),
      ]);
      Obj.update(this._feed, (feed) => {
        feed.rewindFrom = undefined;
      });
    });
  }

  /** The latest open turn's `turnBegin` id, which its events carry as their thread; several run at once in light threads. */
  #turn: Trajectory.EventId | undefined;

  /**
   * Opens a turn, recording first a rewind the UI left on the feed.
   */
  #beginTurn(
    model: RunProps['model'],
    thread: RunProps['thread'],
  ): Effect.Effect<Trajectory.EventId, never, Database.Service> {
    return Effect.gen({ self: this }, function* () {
      yield* this.applyPendingRewind();
      const begin = yield* TrajectoryStore.beginTurn(this._feed, { model, thread });
      this.#turn = begin;
      return begin;
    });
  }

  /**
   * The events one output of the turn becomes. The turn's prompt is its first user message (see
   * `TrajectoryStore.promptEvents`); any later user-role output is a note from the system (e.g. a tool fault), not
   * something a person typed.
   */
  #outputEvents(
    message: Message.Message,
    turn: Trajectory.EventId,
    prompt: { source?: TurnSource; resumed: boolean; written: boolean },
  ) {
    if (message.sender.role !== 'user') {
      return [toEvent(message, turn)];
    }
    if (prompt.written) {
      return [toEvent(message, turn, { role: 'event', name: 'system' })];
    }
    prompt.written = true;
    return TrajectoryStore.promptEvents(message, turn, prompt.source, { resumed: prompt.resumed });
  }

  /**
   * Creates a new cancelable request effect.
   */
  public createRequest<R = never>(
    params: RunProps<R>,
  ): Effect.Effect<Message.Message[], AiRequest.RunError, AiRequest.RunRequirements | R> {
    // This request's own turn: turns in light threads run concurrently on one session.
    let begun: Trajectory.EventId | undefined;
    return Effect.gen({ self: this }, function* () {
      yield* AiTelemetry.annotateKind(AiTelemetry.KIND.turn);
      const inputTruncated = yield* AiTelemetry.annotateContent(AiTelemetry.ATTRIBUTES.input, () =>
        serializePrompt(params.prompt),
      );

      yield* Trace.emitRequestPhase('loading-history');
      // Before the history is read, so a redelivered prompt's interrupted turn is part of it.
      const resumed = yield* TrajectoryStore.resumeInterrupted(this._feed, params.source);
      const history = yield* TrajectoryStore.history(this._feed, params.thread);
      const turn = yield* this.#beginTurn(params.model, params.thread);
      begun = turn;
      const turnToolkit =
        params.thread === undefined && !params.delegation
          ? params.toolkit
          : OpaqueToolkit.merge(
              ...(params.toolkit ? [params.toolkit] : []),
              ThreadToolkit.make(this._feed, turn, Context.get(this._runtime, Database.Service).db, {
                delegate: params.delegation,
              }),
            );
      const prompt = { source: params.source, resumed, written: false };
      markWork('session.history-loaded');
      const skills = this.context.getSkills();
      const objects = this.context.getObjects();

      log('run', {
        history: history.length,
        skills: skills.length,
        objects: objects.length,
      });

      // Formatted once per binding set and source text rather than per model call: formatting loads
      // every skill's template, each a wait behind the page's other work, and an unchanged prompt is
      // also what lets the provider's prompt cache hit across turns. The atoms keep their arrays'
      // identity until a binding changes them; a source not loaded here cannot be compared, so it
      // formats again.
      const sources = (currentSkills: Skill.Skill[]): (string | undefined)[] => [
        ...this.#instructions.map((instructions) => instructions.text.target?.content),
        ...currentSkills.map((skill) => skill.instructions.source.target?.content),
      ];
      let formatted:
        | { skills: Skill.Skill[]; objects: Obj.Unknown[]; sources: (string | undefined)[]; text: string }
        | undefined;
      const formatSystem = (currentSkills: Skill.Skill[], currentObjects: Obj.Unknown[]) =>
        Effect.gen({ self: this }, function* () {
          const currentSources = sources(currentSkills);
          if (
            formatted?.skills === currentSkills &&
            formatted.objects === currentObjects &&
            currentSources.every((source, index) => source !== undefined && source === formatted?.sources[index])
          ) {
            return formatted.text;
          }
          const text = yield* formatSystemPrompt({
            system: params.system,
            skills: currentSkills,
            objects: currentObjects,
            instructions: this.#instructions,
          }).pipe(Effect.orDie);
          formatted = { skills: currentSkills, objects: currentObjects, sources: currentSources, text };
          return text;
        });

      const request = new AiRequest.Request({
        summarizationThreshold: SUMMARY_THRESHOLD,
        observer: params.observer,
        persist: params.persist,
        onOutput: (message) =>
          TrajectoryStore.append(this._feed, this.#outputEvents(message, turn, prompt)).pipe(
            Effect.provideService(Database.Service, Context.get(this._runtime, Database.Service)),
          ),
      });

      yield* request.begin({
        history,
        skills,
        objects,
        instructions: this.#instructions,
        prompt: params.prompt,
        sender: params.sender,
        promptId: params.source && 'message' in params.source ? params.source.message : undefined,
        system: params.system,
        systemPrompt: yield* formatSystem(skills, objects),
      });

      markWork('session.request-begun');

      // Fire begin-request hooks declared by the bound skills. These run in the agent's turn
      // fiber (Tier A only), so they cannot reach the live host (Tier B) — that is the end hook's job.
      yield* SkillHooks.runHooks({
        skills,
        phase: 'begin-request',
        invoke: (operation, input) => Operation.invoke(operation, input).pipe(Effect.asVoid, Effect.orDie),
      });

      // Turn loop: recompute toolkit and system prompt between turns to pick up dynamically enabled skills.
      // Each iteration is scoped so the MCP connections it opens are closed before the next opens its own.
      const runIteration = Effect.gen({ self: this }, function* () {
        markWork('session.iteration');
        yield* Effect.promise(() => this.context.sync());
        markWork('session.context-synced');
        const currentSkills = this.context.getSkills();
        const mcps = yield* connectMcpServers(currentSkills, params.mcpServers);
        yield* Trace.emitRequestPhase('building-toolkit');
        const toolkit = yield* createToolkit({
          toolkit: turnToolkit,
          skills: currentSkills,
          opaqueToolkits: mcps,
        });

        markWork('session.toolkit-built');
        log('toolkit', { tools: Record.keys(toolkit.toolkit.tools) });
        const system = yield* formatSystem(currentSkills, this.context.getObjects());
        markWork('session.system-prompt-built');

        const { done, finishReason } = yield* request.runAgentTurn({ system, toolkit });
        if (done) {
          return 'done' as const;
        }
        // A paused server-tool turn (e.g. Anthropic `pause_turn`) resumes with another request and
        // no local tool execution; the trailing server tool call must be left intact for the provider.
        if (finishReason === 'pause') {
          return 'continue' as const;
        }

        yield* request.runTools({ toolkit });
        markWork('session.tools-done');
        return 'continue' as const;
      }).pipe(Effect.scoped);

      while ((yield* runIteration) !== 'done') {}

      log('result', {
        messages: request.pending.length,
        duration: request.duration,
        toolCalls: request.toolCalls,
      });

      const output = [...request.pending];
      const outputTruncated = yield* AiTelemetry.annotateContent(AiTelemetry.ATTRIBUTES.output, () =>
        output.map(serializeMessage),
      );
      if (inputTruncated || outputTruncated) {
        yield* Effect.annotateCurrentSpan(AiTelemetry.ATTRIBUTES.truncated, true);
      }
      return output;
    }).pipe(
      // A turn that began ends, so its thread merges into the conversation even when the request failed.
      Effect.onExit((exit) => {
        const turn = begun;
        begun = undefined;
        if (this.#turn === turn) {
          this.#turn = undefined;
        }
        return turn !== undefined
          ? TrajectoryStore.endTurn(this._feed, turn, exit, { source: params.source })
          : Effect.void;
      }),
      Effect.provideService(Database.Service, Context.get(this._runtime, Database.Service)),
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
      Effect.annotateSpans(sessionAnnotations(this._feed)),
    );
  }
}

const connectMcpServers = (
  skills: readonly Skill.Skill[],
  spaceServers: readonly McpToolkit.Options[] = [],
): Effect.Effect<OpaqueToolkit.OpaqueToolkit[], never, Trace.TraceService | Scope.Scope> => {
  const skillServers: McpToolkit.Options[] = pipe(
    skills,
    Array.flatMap((_) => _.mcpServers ?? []),
    Array.map(({ url, protocol, apiKey }) => ({ url, protocol, apiKey })),
  );
  const allServers = [...skillServers, ...spaceServers];
  if (allServers.length === 0) {
    // Naming a phase that has nothing to do would misreport where the wait actually is.
    return Effect.succeed([]);
  }

  const connect = pipe(
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
            yield* Trace.write(Trace.McpServerError, {
              url: error.url,
              protocol: error.protocol,
              message: error.message,
              unauthorized: error.unauthorized,
            });
          }),
        ),
        // Catch unexpected defects too (e.g. malformed tool schemas) so a single broken
        // server can never abort the whole turn — surface them through the same channel.
        Effect.catchDefect((defect) =>
          Effect.gen(function* () {
            const message = defect instanceof Error ? defect.message : String(defect);
            log.warn('Unexpected MCP defect', { url: options.url, message });
            yield* Trace.write(Trace.McpServerError, {
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

  return Effect.gen(function* () {
    // Reported before the connections are opened, since opening them is the wait being reported.
    yield* Trace.emitRequestPhase('connecting-mcp', { detail: String(allServers.length) });
    return yield* connect;
  });
};

/** A message of the turn as the event recording it, in the turn's thread when given. */
const toEvent = (message: Message.Message, thread?: Trajectory.EventId, sender?: Trajectory.Sender): Trajectory.Event =>
  Trajectory.make({
    id: message.id,
    payload: {
      _tag: 'message',
      blocks: message.blocks,
      attachments: message.attachments,
      properties: message.properties,
    },
    sender: sender ?? Legacy.toSender(message.sender),
    thread,
    created: message.created,
  });

/** The prompt as the turn span carries it: text as is, blocks reduced to what identifies them. */
export const serializePrompt = (prompt: string | readonly ContentBlock.Any[]): unknown =>
  typeof prompt === 'string' ? prompt : prompt.map(serializeBlock);

/** A turn's message as its span carries it. */
export const serializeMessage = (message: Message.Message): unknown => ({
  role: message.sender.role,
  blocks: message.blocks.map(serializeBlock),
});

const serializeBlock = (block: ContentBlock.Any): unknown => {
  switch (block._tag) {
    case 'text':
      return { type: 'text', text: block.text };
    case 'toolCall':
      return { type: 'toolCall', name: block.name, input: block.input };
    case 'toolResult':
      return { type: 'toolResult', name: block.name, result: block.result, error: block.error };
    default:
      return { type: block._tag };
  }
};

/**
 * Span annotations identifying the conversation a model call belongs to. The space is read off the
 * feed's URI (`echo://<spaceId>/<objectId>`) rather than passed in, so it cannot go missing.
 */
export const sessionAnnotations = (feed: Feed.Feed): Record<string, string> => {
  const uri = Obj.getURI(feed, { prefer: 'absolute' });
  const eid = EID.tryParse(uri);
  const spaceId = eid && EID.getSpaceId(eid);
  return {
    [AiTelemetry.ATTRIBUTES.sessionId]: uri,
    ...(spaceId ? { [AiTelemetry.ATTRIBUTES.spaceId]: spaceId } : {}),
  };
};

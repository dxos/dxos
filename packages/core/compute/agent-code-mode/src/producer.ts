//
// Copyright 2026 DXOS.org
//

import * as Tool from 'effect/ai/Tool';
import * as Context from 'effect/Context';
import type * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Record from 'effect/Record';

import { type MakeTurnProducer, type TurnProducer, type TurnRequest } from '@dxos/agent-runtime';
import { type OpaqueToolkit, callTool } from '@dxos/ai';
import {
  AiRequest,
  AiSession,
  TrajectoryStore,
  createToolkit,
  formatSystemPrompt,
  getOperationFromTool,
} from '@dxos/assistant';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { Database, Filter, Obj, Ref, Registry } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { type ContentBlock, Message } from '@dxos/types';

import { PlainDialect } from './dialect-plain.ts';
import type { Dialect, SandboxOperation, SandboxType } from './Dialect.ts';
import { type Catalog, makeDiscovery, serveLocally } from './discovery.ts';
import { type CallLabel, EVAL_TOOL_NAME, type Evaluation, labelEvalCall, makeEvalToolkit } from './eval-tool.ts';
import { describeTypes } from './fields.ts';
import * as Sandbox from './Sandbox.ts';

/** How a code-mode producer is configured; every field has a default, so `{}` is a working producer. */
export type CodeModeOptions = {
  /**
   * What the model writes and what it writes it against.
   * @default PlainDialect
   */
  dialect?: Dialect;

  /**
   * Where the model's code runs.
   * @default Sandbox.layerAsyncFunction's implementation — in this process, in this thread.
   */
  sandbox?: Sandbox.Sandbox;

  /** Abandons an evaluation that has not finished in this long (see the note in `Sandbox`). */
  timeout?: Duration.Input;

  /** Guidance appended to the dialect's instructions. */
  system?: string;

  /** Characters of printed output returned from one eval call before it is truncated. */
  maxOutput?: number;

  /**
   * Cap on the model/tool turns of a single request; uncapped when omitted. A code-mode agent's loop is driven
   * entirely by what its own code printed, so a host that cannot watch the turn can bound it here.
   */
  maxTurns?: number;

  /**
   * The prompt states one skill, Discovery, and the model looks up every other skill, operation and type through its
   * operations instead of reading them in the prompt. The enabled skills' operations stay callable.
   */
  discovery?: boolean;
};

/**
 * Runs each turn in "code mode": the model carries ONE tool, `eval`, and reaches the workspace by
 * writing code rather than by calling a tool per action. Operations bound by the conversation's
 * skills are not projected as tools at all — they are functions the code calls, so a task spanning
 * several of them costs one turn instead of one turn each.
 *
 * Substituted for {@link makeAiSessionTurnProducer} through `AgentProcessOptions.makeTurnProducer`;
 * the process's queue, alarms, redelivery and hydration are untouched.
 */
export const makeCodeModeTurnProducer =
  (options: CodeModeOptions = {}): MakeTurnProducer =>
  ({ feed, runtime, instructions }) =>
    EffectEx.acquireReleaseResource(() => new AiSession.Session({ feed, runtime, instructions })).pipe(
      Effect.map((session): TurnProducer => ({
        runTurn: (params) => runCodeModeTurn({ session, feed, instructions, params, options }),
        getSkills: () => session.context.getSkills(),
      })),
    );

type RunTurnOptions = {
  session: AiSession.Session;
  feed: Parameters<MakeTurnProducer>[0]['feed'];
  instructions: Parameters<MakeTurnProducer>[0]['instructions'];
  params: TurnRequest;
  options: CodeModeOptions;
};

/**
 * The turn loop, driven directly rather than through `Session.createRequest`: the whole point is a
 * toolkit that does NOT contain the skills' tools, which `createRequest` always builds from them.
 */
const runCodeModeTurn = ({
  session,
  feed,
  instructions,
  params,
  options,
}: RunTurnOptions): Effect.Effect<Message.Message[], AiRequest.RunError, AiRequest.RunRequirements> =>
  Effect.gen(function* () {
    const dialect = options.dialect ?? PlainDialect;
    // Resolved from the environment when a host provided one, so an out-of-process sandbox can be
    // installed as a layer without every caller passing it; the in-process one is the fallback.
    const sandbox =
      options.sandbox ?? Option.getOrElse(yield* Effect.serviceOption(Sandbox.Service), () => Sandbox.inProcess);

    // The turn's own services, not the producer's database-only runtime: the sandbox runs the
    // model's effects, and `Operation.invoke` resolves its handler through `Operation.Service`.
    const runtime = yield* Effect.context<Database.Service | Operation.Service>();
    // What discovery reads skills, operation records and skill instructions through.
    const services = yield* Effect.context<Database.Service | Operation.Service | Registry.Service>();

    // A turn in a thread (a light thread or a fork) sees that thread's prompt, not main's.
    const history =
      params.thread === undefined
        ? yield* Effect.promise(() => session.getHistory())
        : yield* TrajectoryStore.history(feed, params.thread);
    // The turn records the prompt itself (consuming a queued one), so the request's copy of it is not appended again.
    const prompt = Message.make({
      sender: { role: 'user', ...params.sender },
      blocks: typeof params.prompt === 'string' ? [{ _tag: 'text', text: params.prompt }] : [...params.prompt],
    });
    const promptId = params.source && 'message' in params.source ? params.source.message : prompt.id;
    return yield* TrajectoryStore.turn(
      feed,
      { prompt, source: params.source, model: params.model, thread: params.thread },
      (append) =>
        Effect.gen(function* () {
          // Rebound each turn below, since a skill enabled mid-request changes what the operations are.
          let labelCall = labelEvalCall([]);
          const evaluations = makeEvaluationLog();
          const request = new AiRequest.Request({
            onOutput: (message) =>
              message.id === promptId
                ? Effect.void
                : append([annotateEvalBlocks(message, labelCall, evaluations)]).pipe(Effect.provide(runtime)),
          });

          yield* request.begin({
            history,
            skills: session.context.getSkills(),
            objects: session.context.getObjects(),
            instructions,
            prompt: params.prompt,
            promptId,
            sender: params.sender,
            system: params.system,
          });

          const maxTurns = options.maxTurns ?? Number.POSITIVE_INFINITY;
          // Each iteration is scoped so the MCP connections it opens close before the next opens its own.
          const runIteration = (turn: number) =>
            Effect.gen(function* () {
              yield* Effect.promise(() => session.context.sync());
              evaluations.clear();
              const skills = session.context.getSkills();
              // An MCP tool has no operation behind it, so it reaches the code as a call the dialect binds by name.
              const mcps = yield* AiSession.connectMcpServers(
                params.mcpServers ? yield* AiSession.readMcpServers(params.mcpServers) : [],
              );
              const bound = yield* projectOperations(skills, mcps);
              const types = yield* registeredTypes;
              const discovery = options.discovery
                ? makeDiscovery({
                    dialect,
                    enabled: skills,
                    operations: bound,
                    types,
                    catalog: readCatalog.pipe(Effect.provide(services)),
                    instructionsOf: (skill) =>
                      Template.processTemplate(skill.instructions).pipe(Effect.provide(services), Effect.orDie),
                    enable: (skill) =>
                      Skill.upsert(Skill.getKey(skill)).pipe(
                        Effect.flatMap((stored) =>
                          Effect.promise(() => session.context.bind({ skills: [Ref.make(stored)] })),
                        ),
                        Effect.provide(services),
                        Effect.orDie,
                      ),
                  })
                : undefined;
              // Callable either way; only what the prompt states differs.
              const operations = discovery === undefined ? bound : [...discovery.operations, ...bound];
              labelCall = labelEvalCall(operations);
              const toolkit = makeEvalToolkit({
                dialect,
                sandbox,
                runtime:
                  discovery === undefined
                    ? runtime
                    : Context.add(
                        runtime,
                        Operation.Service,
                        serveLocally(Context.get(runtime, Operation.Service), discovery.operations),
                      ),
                operations,
                skills: skills.flatMap((skill) => Obj.getMeta(skill).key ?? []),
                maxOutput: options.maxOutput,
                timeout: options.timeout,
                onEvaluated: evaluations.add,
              });
              const system = yield* formatSystemPrompt({
                system: [
                  discovery === undefined
                    ? dialect.instructions({ operations, types })
                    : dialect.instructions({ operations: discovery.operations, types: [], discovery: true }),
                  options.system,
                  params.system,
                ]
                  .filter(isPresent)
                  .join('\n\n'),
                skills: discovery === undefined ? skills : [discovery.skill],
                objects: session.context.getObjects(),
                instructions,
              }).pipe(Effect.orDie);

              const { done, finishReason } = yield* request.runAgentTurn({
                system,
                toolkit,
              });
              if (done) {
                return 'done' as const;
              }
              // Checked before the pause branch below: a provider that keeps pausing would otherwise
              // re-issue the request forever, since a paused turn skips the rest of the loop.
              if (turn + 1 >= maxTurns) {
                yield* request.submitNotice(
                  `Stopped after ${maxTurns} turns without a final answer. Report what you established and what is left.`,
                );
                return 'done' as const;
              }
              // A paused server-tool turn resumes with another request and no local tool execution.
              if (finishReason === 'pause') {
                return 'continue' as const;
              }
              yield* request.runTools({ toolkit });
              return 'continue' as const;
            }).pipe(Effect.scoped);

          for (let turn = 0; (yield* runIteration(turn)) !== 'done'; turn++) {}

          return [...request.pending];
        }),
    );
  }).pipe(
    // What `AiSession.createRequest` provides around its own turn: an operation invoked from the
    // sandbox is part of this conversation, the same as one invoked as a tool.
    Effect.provide(Operation.withInvocationOptions({ conversation: Obj.getURI(feed) })),
    Effect.withSpan('CodeMode.runTurn'),
  );

/**
 * The request's evaluations by the `eval` call each answered, so a result written to the feed takes the operations
 * its own call ran. An evaluation whose result is never written (the call was interrupted) is dropped when the next
 * iteration starts.
 */
const makeEvaluationLog = () => {
  const byCall = new Map<string, Evaluation>();
  return {
    add: (evaluation: Evaluation): void => {
      if (evaluation.toolCallId !== undefined) {
        byCall.set(evaluation.toolCallId, evaluation);
      }
    },
    take: (block: ContentBlock.ToolResult): Evaluation | undefined => {
      const evaluation = byCall.get(block.toolCallId);
      byCall.delete(block.toolCallId);
      return evaluation;
    },
    clear: (): void => byCall.clear(),
  };
};

/** What an `eval` block is annotated with: a call's label, or the operations a result's evaluation ran. */
type EvalAnnotation = CallLabel | Pick<ContentBlock.ToolResult, 'invocations'>;

/**
 * Annotates the message's `eval` blocks before it reaches the feed, which is what the thread renders and what a
 * hook reads: a call is labelled after the operations its code names, and a result records the operations its code
 * actually ran — every code-mode call is an eval, and these are the only things that tell them apart.
 */
const annotateEvalBlocks = (
  message: Message.Message,
  labelCall: (block: ContentBlock.ToolCall) => CallLabel | undefined,
  evaluations: ReturnType<typeof makeEvaluationLog>,
): Message.Message => {
  const annotations = message.blocks.map((block): EvalAnnotation | undefined => {
    if (block._tag === 'toolCall' && block.name === EVAL_TOOL_NAME) {
      return labelCall(block);
    }
    if (block._tag === 'toolResult' && block.name === EVAL_TOOL_NAME) {
      const invocations = evaluations.take(block)?.invocations ?? [];
      return invocations.length > 0 ? { invocations: [...invocations] } : undefined;
    }
    return undefined;
  });
  if (annotations.some((annotation) => annotation !== undefined)) {
    Obj.update(message, (message) => {
      message.blocks.forEach((block, index) => {
        const annotation = annotations[index];
        if (annotation !== undefined) {
          Object.assign(block, annotation);
        }
      });
    });
  }
  return message;
};

/**
 * The operation a tool invokes, when one backs it.
 *
 * Absent for a provider-defined or MCP tool, which carries no annotation context — and on which
 * `getOperationFromTool` throws rather than returning `None`, so the throw is contained here.
 */
const operationBehind = (tool: Tool.Any): Operation.Definition.Any | undefined => {
  try {
    return Option.getOrUndefined(getOperationFromTool(tool));
  } catch {
    return undefined;
  }
};

/**
 * Every object and relation type the workspace has registered, with its fields.
 *
 * Stated in the prompt rather than left to be discovered: a dialect that binds the real modules
 * invites the model to introspect a schema for the shape it needs, and that costs turns it should
 * be spending on the task.
 */
const registeredTypes: Effect.Effect<SandboxType[], never, Database.Service> = Effect.map(Database.Service, ({ db }) =>
  describeTypes(db),
);

/** The registry's skills and operation records, which discovery searches beyond the enabled skills. */
const readCatalog: Effect.Effect<Catalog, never, Registry.Service> = Effect.all({
  skills: Registry.runQuery(Filter.type(Skill.Skill)),
  records: Registry.runQuery(Filter.type(Operation.PersistentOperation)),
});

/**
 * Projects the skills' tools, and those of the turn's MCP servers, into callable operations. Resolution goes through the ordinary toolkit
 * path, so an operation reachable in code mode is exactly the one a tool-calling agent would reach —
 * same registry, same handlers, same invocation options.
 */
export const projectOperations = Effect.fnUntraced(function* (
  skills: readonly Skill.Skill[],
  opaqueToolkits: readonly OpaqueToolkit.OpaqueToolkit[] = [],
) {
  const skillToolkit = yield* createToolkit({ skills, opaqueToolkits });
  const handlers = yield* skillToolkit.handlers;
  return Record.toEntries(skillToolkit.toolkit.tools).map(([name, tool]): SandboxOperation => ({
    name,
    description: tool.description,
    parameters: Tool.getJsonSchema(tool),
    // Carried so a dialect can hand the model the operation itself rather than a wrapper around it.
    definition: operationBehind(tool),
    // A failed operation raises in the sandbox — as a rejected promise or a failed effect,
    // depending on the dialect — since `toolResultValue` throws whatever the tool reported.
    invoke: (input: unknown) =>
      callTool(handlers, {
        _tag: 'toolCall',
        toolCallId: `code-mode-${name}`,
        name,
        input: JSON.stringify(input ?? {}),
        providerExecuted: false,
      }).pipe(Effect.map(toolResultValue), Effect.orDie),
  }));
});

/** What an operation call resolves to: the operation's result, or a throw carrying its error. */
const toolResultValue = (result: ContentBlock.ToolResult): unknown => {
  if (result.error !== undefined) {
    throw new Error(result.error);
  }
  return typeof result.result === 'string' ? tryParseJson(result.result) : result.result;
};

const tryParseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const isPresent = (value: string | undefined): value is string => value !== undefined && value.length > 0;

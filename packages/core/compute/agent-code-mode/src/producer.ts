//
// Copyright 2026 DXOS.org
//

import type * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Record from 'effect/Record';
import * as Tool from 'effect/unstable/ai/Tool';

import { type MakeTurnProducer, type TurnProducer, type TurnRequest } from '@dxos/agent-runtime';
import { callTool } from '@dxos/ai';
import { AiRequest, AiSession, createToolkit, formatSystemPrompt, getOperationFromTool } from '@dxos/assistant';
import * as Operation from '@dxos/compute/Operation';
import type * as Skill from '@dxos/compute/Skill';
import { Database, Obj, Type } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import type { ContentBlock, Message } from '@dxos/types';

import { PlainDialect } from './dialect-plain.ts';
import type { Dialect, SandboxOperation, SandboxType } from './Dialect.ts';
import { makeEvalToolkit } from './eval-tool.ts';
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
   * Cap on the model/tool turns of a single request. A code-mode agent's loop is driven entirely by
   * what its own code printed, so a model misreading its output can iterate indefinitely.
   */
  maxTurns?: number;
};

const DEFAULT_MAX_TURNS = 16;

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

    const history = yield* Effect.promise(() => session.getHistory());
    const request = new AiRequest.Request({
      onOutput: (message) => Effect.promise(() => session.appendTurnMessage(message)),
    });

    yield* request.begin({
      history,
      skills: session.context.getSkills(),
      objects: session.context.getObjects(),
      instructions,
      prompt: params.prompt,
      system: params.system,
    });

    const maxTurns = options.maxTurns ?? DEFAULT_MAX_TURNS;
    for (let turn = 0; ; turn++) {
      yield* Effect.promise(() => session.context.sync());
      const skills = session.context.getSkills();
      const operations = yield* projectOperations(skills);
      const toolkit = makeEvalToolkit({
        dialect,
        sandbox,
        runtime,
        operations,
        maxOutput: options.maxOutput,
        timeout: options.timeout,
      });
      const system = yield* formatSystemPrompt({
        system: [dialect.instructions({ operations, types: yield* registeredTypes }), options.system, params.system]
          .filter(isPresent)
          .join('\n\n'),
        skills,
        objects: session.context.getObjects(),
        instructions,
      }).pipe(Effect.orDie);

      const { done, finishReason } = yield* request.runAgentTurn({ system, toolkit });
      if (done) {
        break;
      }
      // Checked before the pause branch below: a provider that keeps pausing would otherwise
      // re-issue the request forever, since a paused turn skips the rest of the loop.
      if (turn + 1 >= maxTurns) {
        yield* request.submitNotice(
          `Stopped after ${maxTurns} turns without a final answer. Report what you established and what is left.`,
        );
        break;
      }
      // A paused server-tool turn resumes with another request and no local tool execution.
      if (finishReason === 'pause') {
        continue;
      }
      yield* request.runTools({ toolkit });
    }

    return [...request.pending];
  }).pipe(
    // What `AiSession.createRequest` provides around its own turn: an operation invoked from the
    // sandbox is part of this conversation, the same as one invoked as a tool.
    Effect.provide(Operation.withInvocationOptions({ conversation: Obj.getURI(feed) })),
    Effect.withSpan('CodeMode.runTurn'),
  );

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
 * Every object type the workspace has registered, with its fields.
 *
 * Stated in the prompt rather than left to be discovered: a dialect that binds the real modules
 * invites the model to introspect a schema for the shape it needs, and that costs turns it should
 * be spending on the task.
 */
const registeredTypes: Effect.Effect<SandboxType[], never, Database.Service> = Effect.gen(function* () {
  const { db } = yield* Database.Service;
  return db.registry
    .list()
    .filter((entity) => Type.isType(entity) && Type.isObject(entity))
    .map((type) => ({
      typename: Type.getTypename(type) ?? '',
      // The same `fields` record the sandbox's bound type carries, which is what the model would
      // otherwise go looking for.
      fields: Object.keys(('fields' in type && type.fields) || {}),
    }))
    .filter(({ typename }) => typename.length > 0);
});

/**
 * Projects the skills' tools into callable operations. Resolution goes through the ordinary toolkit
 * path, so an operation reachable in code mode is exactly the one a tool-calling agent would reach —
 * same registry, same handlers, same invocation options.
 */
const projectOperations = Effect.fnUntraced(function* (skills: readonly Skill.Skill[]) {
  const skillToolkit = yield* createToolkit({ skills });
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

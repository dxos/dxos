//
// Copyright 2026 DXOS.org
//

import type * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Record from 'effect/Record';
import * as Tool from 'effect/unstable/ai/Tool';

import { callTool } from '@dxos/ai';
import { AiRequest, AiSession, createToolkit, formatSystemPrompt } from '@dxos/assistant';
import type * as Skill from '@dxos/compute/Skill';
import type { Database } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { type ContentBlock, type Message } from '@dxos/types';
import { trim } from '@dxos/util';

import { type MakeTurnProducer, type TurnProducer, type TurnRequest } from '../turn-producer.ts';
import { type SandboxOperation, makeEvalToolkit } from './sandbox.ts';

export type CodeModeOptions = {
  /** Guidance appended to the code-mode system prompt. */
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
 * writing JavaScript against the ECHO API rather than by calling a tool per action. Operations bound
 * by the conversation's skills are not projected as tools at all — they are functions on `ops` inside
 * the sandbox, so a task spanning several of them costs one turn instead of one turn each.
 *
 * Substituted for {@link makeAiSessionTurnProducer} through `AgentProcessOptions.makeTurnProducer`;
 * the process's queue, alarms, redelivery and hydration are untouched.
 */
export const makeCodeModeTurnProducer =
  (options: CodeModeOptions = {}): MakeTurnProducer =>
  ({ feed, runtime, instructions }) =>
    EffectEx.acquireReleaseResource(() => new AiSession.Session({ feed, runtime, instructions })).pipe(
      Effect.map((session): TurnProducer => ({
        runTurn: (params) => runCodeModeTurn({ session, runtime, instructions, params, options }),
        getSkills: () => session.context.getSkills(),
      })),
    );

type RunTurnOptions = {
  session: AiSession.Session;
  runtime: Context.Context<Database.Service>;
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
  runtime,
  instructions,
  params,
  options,
}: RunTurnOptions): Effect.Effect<Message.Message[], AiRequest.RunError, AiRequest.RunRequirements> =>
  Effect.gen(function* () {
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
      const toolkit = makeEvalToolkit({ runtime, operations, maxOutput: options.maxOutput });
      const system = yield* formatSystemPrompt({
        system: [codeModeInstructions(operations), options.system, params.system].filter(isPresent).join('\n\n'),
        skills,
        objects: session.context.getObjects(),
        instructions,
      }).pipe(Effect.orDie);

      const { done, finishReason } = yield* request.runAgentTurn({ system, toolkit });
      if (done) {
        break;
      }
      // A paused server-tool turn resumes with another request and no local tool execution.
      if (finishReason === 'pause') {
        continue;
      }
      if (turn + 1 >= maxTurns) {
        yield* request.submitNotice(
          `Stopped after ${maxTurns} turns without a final answer. Report what you established and what is left.`,
        );
        break;
      }
      yield* request.runTools({ toolkit });
    }

    return [...request.pending];
  }).pipe(Effect.withSpan('CodeMode.runTurn'));

/**
 * Projects the skills' tools into sandbox functions. Resolution goes through the ordinary toolkit
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
    // A failed operation reaches the sandbox as a rejected promise the model's own code can catch,
    // since `toolResultValue` raises whatever error the tool reported.
    invoke: (input) =>
      callTool(handlers, {
        _tag: 'toolCall',
        toolCallId: `code-mode-${name}`,
        name,
        input: JSON.stringify(input ?? {}),
        providerExecuted: false,
      }).pipe(Effect.map(toolResultValue), Effect.orDie),
  }));
});

/** What `ops.<name>(...)` resolves to: the operation's result, or a throw carrying its error. */
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

/**
 * The API reference the model writes against. Rendered per turn, since the operations follow the
 * skills currently bound to the conversation.
 */
const codeModeInstructions = (operations: readonly SandboxOperation[]): string => trim`
  ## Code mode

  You have exactly one tool, \`eval\`, which runs the body of an async JavaScript function against
  this workspace and returns whatever that code printed. Nothing else is visible to you: a value you
  do not \`print\` never reaches you. Do not use \`import\` or \`require\` — the API below is in scope.

  Prefer one \`eval\` call that does the whole job — query, inspect, change, print — over a call per
  step. Print the specific values you need to reason about, not whole objects, and keep the output
  small.

  ### API

  - \`print(...values)\` — adds a line to this call's output. Strings go through verbatim, everything
    else is printed as JSON.
  - \`await query(typename, props?)\` — objects of that typename, optionally narrowed by exact
    property values, e.g. \`await query('example.com/type/Task', { status: 'open' })\`.
  - \`await make(typename, props)\` — a new object; it is not stored until you add it.
  - \`await add(obj)\` / \`await remove(obj)\` — store or delete an object.
  - \`update(obj, (obj) => { obj.field = value; })\` — the only way to change a stored object.
  - \`await flush()\` — waits for pending writes to land; call it before printing a final confirmation.

  ${operations.length > 0 ? renderOperations(operations) : '### Operations\n\nNo operations are bound to this conversation.'}
`;

const renderOperations = (operations: readonly SandboxOperation[]): string => trim`
  ### Operations

  The skills above describe their capabilities as tools; in code mode they are NOT tools. Each one is
  an async function on \`ops\`, taking one argument matching its parameter schema. A failed operation
  throws, so wrap a call you expect to fail in \`try\`/\`catch\`.

  ${operations
    .map(
      (operation) =>
        trim`
      - \`await ops.${operation.name}(input)\` — ${operation.description ?? 'No description.'}
        input: ${JSON.stringify(operation.parameters)}
    `,
    )
    .join('\n')}
`;

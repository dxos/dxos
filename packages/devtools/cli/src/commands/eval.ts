//
// Copyright 2026 DXOS.org
//

import * as Args from 'effect/cli/Argument';
import * as Command from 'effect/cli/Command';
import * as Options from 'effect/cli/Flag';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as FileSystem from 'effect/FileSystem';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Result from 'effect/Result';
import * as Stdio from 'effect/Stdio';
import * as Stream from 'effect/Stream';

import {
  type Dialect,
  EffectDialect,
  PlainDialect,
  Sandbox,
  describeTypes,
  evaluate,
  projectOperations,
} from '@dxos/agent-code-mode';
import { OpaqueToolkit } from '@dxos/ai';
import { ToolExecutionServices } from '@dxos/assistant';
import { CommandConfig, Common, withTypes } from '@dxos/cli-util';
import type * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Skill from '@dxos/compute/Skill';
import { Database, Entity, Obj } from '@dxos/echo';

import { CliError } from '../util/errors.ts';
import { chatLayer, operationHandlers, skillRegistry, toolkits, types } from '../util/index.ts';

/** Keyed by the name each dialect reports in traces, so the flag names the dialect the same way. */
const DIALECTS = {
  effect: EffectDialect,
  plain: PlainDialect,
} as const satisfies Record<string, Dialect>;

/** What `projectOperations` resolves skill tools through: the same services `dx chat` runs its tools with. */
const toolExecutionLayer = ToolExecutionServices.pipe(
  Layer.provideMerge(OpaqueToolkit.providerLayer(OpaqueToolkit.merge(...toolkits))),
  Layer.provideMerge(OperationHandlerSet.provide(operationHandlers)),
);

/**
 * Runs a program against a space in the same dialect a code-mode agent writes for its `eval` tool,
 * so an agent driving the CLI writes the code it would write in Composer and reads back the same text.
 */
export const evaluateCommand = Command.make(
  'eval',
  {
    code: Args.String('code').pipe(
      Args.withDescription('The program, as the body the eval tool takes. Pass "-" (or nothing) to read stdin.'),
      Args.optional,
    ),
    file: Options.File('file', { mustExist: true }).pipe(
      Options.withDescription('Read the program from a file.'),
      Options.withAlias('f'),
      Options.optional,
    ),
    spaceId: Common.spaceId.pipe(Options.optional),
    dialect: Options.Literals('dialect', ['effect', 'plain']).pipe(
      Options.withDescription('The language the program is written in; Composer agents use "effect".'),
      Options.withDefault('effect'),
    ),
    skills: Options.String('skill').pipe(
      Options.withDescription('Skill whose operations the program may invoke; repeatable. Defaults to every skill.'),
      Options.withAlias('b'),
      Options.atLeast(0),
    ),
    instructions: Options.Boolean('instructions').pipe(
      Options.withDescription("Print the dialect's API reference (the agent's system prompt section) and exit."),
      Options.withDefault(false),
    ),
    maxOutput: Options.Int('max-output').pipe(
      Options.withDescription('Characters of printed output returned before it is truncated.'),
      Options.optional,
    ),
  },
  Effect.fn(function* ({ code, file, dialect: dialectName, skills: skillKeys, instructions, maxOutput }) {
    const { json } = yield* CommandConfig;
    const dialect = DIALECTS[dialectName];
    const operations = yield* projectOperations(yield* resolveSkills(skillKeys)).pipe(
      Effect.provide(toolExecutionLayer),
    );

    if (instructions) {
      const { db } = yield* Database.Service;
      return yield* Console.log(dialect.instructions({ operations, types: describeTypes(db) }));
    }

    const program = yield* readProgram(code, file);
    const result = yield* evaluate({
      code: program,
      dialect,
      sandbox: Sandbox.inProcess,
      runtime: yield* Effect.context<Database.Service | Operation.Service>(),
      operations,
      maxOutput: Option.getOrUndefined(maxOutput),
    }).pipe(Effect.result);

    if (json) {
      yield* Console.log(
        JSON.stringify(
          Result.isSuccess(result) ? { ok: true, output: result.success } : { ok: false, output: result.failure },
          null,
          2,
        ),
      );
    } else {
      yield* Console.log(Result.isSuccess(result) ? result.success : result.failure);
    }

    // After printing, so a failed flush cannot swallow output the program already produced.
    yield* Database.flush();

    if (Result.isFailure(result)) {
      // The output above already carries the error; failing only sets the exit code.
      return yield* Effect.fail(new CliError({ message: 'Evaluation failed.' }));
    }
  }),
).pipe(
  Command.withDescription(
    'Run a program against a space in the code-mode dialect agents use for their eval tool, and print its output.',
  ),
  Command.provide(({ spaceId }) => chatLayer({ provider: 'edge', spaceId, functions: operationHandlers })),
  Command.provideEffectDiscard(() => withTypes(...types)),
);

/** The program from the argument, the file, or stdin, in that order. */
const readProgram = Effect.fnUntraced(function* (code: Option.Option<string>, file: Option.Option<string>) {
  if (Option.isSome(code) && code.value !== '-') {
    return code.value;
  }
  if (Option.isSome(file)) {
    const fs = yield* FileSystem.FileSystem;
    return yield* fs.readFileString(file.value);
  }
  const stdio = yield* Stdio.Stdio;
  if (yield* stdio.stdinIsTerminal) {
    return yield* Effect.fail(
      new CliError({ message: 'No program: pass it as an argument, with --file, or on stdin.' }),
    );
  }
  return yield* stdio.stdin.pipe(Stream.decodeText(), Stream.mkString);
});

/** The registry's skills named by key, or all of them when none is named. */
const resolveSkills = Effect.fnUntraced(function* (keys: readonly string[]) {
  const available = skillRegistry.list().filter((entity): entity is Skill.Skill => Obj.instanceOf(Skill.Skill, entity));
  if (keys.length === 0) {
    return available;
  }
  const keyOf = (skill: Skill.Skill) => Entity.getMeta(skill)?.key;
  const unknown = keys.filter((key) => !available.some((skill) => keyOf(skill) === key));
  if (unknown.length > 0) {
    return yield* Effect.fail(
      new CliError({
        message: `Unknown skill: ${unknown.join(', ')}. Available: ${available.map(keyOf).join(', ')}`,
      }),
    );
  }
  return available.filter((skill) => keys.includes(keyOf(skill) ?? ''));
});

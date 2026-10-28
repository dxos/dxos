//
// Copyright 2026 DXOS.org
//

import * as Argument from 'effect/cli/Argument';
import * as Command from 'effect/cli/Command';
import * as Flag from 'effect/cli/Flag';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as FileSystem from 'effect/FileSystem';
import * as Option from 'effect/Option';

import { lintMdl } from '../extension/check.ts';
import { LintError } from './errors.ts';
import { git } from './git.ts';
import { buildSpecIndex } from './spec-index.ts';

const INDEXED_CHECKS = ['mdl/ref', 'mdl/uses'];

export type LintOptions = {
  files: readonly string[];
  /** Keep one check, e.g. `mdl/decision`; the block-type check still knows only the built-in types. */
  only: Option.Option<string>;
};

/** Lints .mdl files with the checks the editor runs; fails when any diagnostic is an error. */
export const lintFiles = Effect.fnUntraced(function* ({ files, only }: LintOptions) {
  const fs = yield* FileSystem.FileSystem;
  const needsIndex = Option.isNone(only) || INDEXED_CHECKS.includes(only.value);
  // Outside a checkout there is nothing to resolve references against, so those checks stay off.
  const index = needsIndex
    ? yield* git(process.cwd(), 'rev-parse', '--show-toplevel').pipe(
        Effect.flatMap(buildSpecIndex),
        Effect.catch(() => Effect.succeed(undefined)),
      )
    : undefined;
  let errors = 0;
  for (const file of files) {
    const text = yield* fs.readFileString(file);
    for (const { from, severity, source, message } of lintMdl(text, {
      index: file.endsWith('.review.mdl') ? undefined : index,
    })) {
      if (Option.isSome(only) && source !== only.value) {
        continue;
      }
      const line = text.slice(0, from).split('\n').length;
      yield* Console.log(`${file}:${line}: ${severity} [${source}]: ${message}`);
      if (severity === 'error') {
        errors++;
      }
    }
  }
  if (errors > 0) {
    return yield* Effect.fail(new LintError({ context: { errors } }));
  }
});

export const lint = Command.make(
  'lint',
  {
    only: Flag.String('only').pipe(Flag.withDescription('Report one check only, e.g. `mdl/decision`.'), Flag.optional),
    files: Argument.String('files').pipe(
      Argument.withDescription('The .mdl files to lint.'),
      Argument.variadic({ min: 1 }),
    ),
  },
  lintFiles,
).pipe(Command.withDescription('Lint .mdl files with the checks the editor runs.'));

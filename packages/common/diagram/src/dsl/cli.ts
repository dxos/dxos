//
// Copyright 2026 DXOS.org
//

//
// Converts a diagram source into DSL text: `moon run diagram:convert -- <file>`, or stdin.
// A file rather than a library call because the point of the DSL is that a scene becomes something
// you check in, and the first step of doing that is getting the text out.
//

import * as Effect from 'effect/Effect';
import { readFileSync } from 'node:fs';

import { EffectEx } from '@dxos/effect';

import { SOURCES, convert } from './convert.ts';

const USAGE = `Usage: convert [--source <${SOURCES.map(({ id }) => id).join('|')}>] [<file>]

Reads a diagram source (stdin when no file is given) and writes the equivalent DSL.
The output is the laid-out form: the dialect places everything, and the text is the result.

Sources:
${SOURCES.map(({ id, description }) => `  ${id.padEnd(16)} ${description}`).join('\n')}`;

const main = Effect.gen(function* () {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log(USAGE);
    return;
  }

  const at = args.indexOf('--source');
  const source = at === -1 ? undefined : args[at + 1];
  // `at + 1` is only a value index when the flag is present; `-1 + 1 === 0` would otherwise eat
  // the first positional argument and silently read stdin instead of the named file.
  const [file] = args.filter((arg, index) => !arg.startsWith('-') && !(at !== -1 && index === at + 1));
  const text = readFileSync(file ?? 0, 'utf8');

  process.stdout.write(yield* convert(text, { source }));
});

EffectEx.runPromise(main).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

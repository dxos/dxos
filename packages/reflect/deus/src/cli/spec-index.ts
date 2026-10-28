//
// Copyright 2026 DXOS.org
//

import * as Command from 'effect/cli/Command';
import * as Flag from 'effect/cli/Flag';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as FileSystem from 'effect/FileSystem';
import * as Option from 'effect/Option';

import { buildSpecIndex } from '../spec-index/index.ts';
import { git } from './git.ts';

export type IndexOptions = {
  /** File to write instead of printing. */
  out: Option.Option<string>;
};

/** Indexes every spec of the checkout by id and prints the JSON, or writes it to `out`. */
export const printIndex = Effect.fnUntraced(function* ({ out }: IndexOptions) {
  const fs = yield* FileSystem.FileSystem;
  const root = yield* git(process.cwd(), 'rev-parse', '--show-toplevel');
  const json = JSON.stringify(yield* buildSpecIndex(root), null, 2);
  if (Option.isSome(out)) {
    yield* fs.writeFileString(out.value, `${json}\n`);
  } else {
    yield* Console.log(json);
  }
});

export const index = Command.make(
  'index',
  { out: Flag.String('out').pipe(Flag.withDescription('Write the index to this file.'), Flag.optional) },
  printIndex,
).pipe(Command.withDescription('Index every .mdl spec of the checkout by its frontmatter id.'));

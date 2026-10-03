//
// Copyright 2026 DXOS.org
//
// The layout-and-judge half of `code-index design`, run under Node because Bun cannot load elkjs.
// Reads `<dir>/diagrams.json` (written by `Design.write`) and writes the chosen `diagram.mmd`,
// `diagram.svg`, `diagram-scores.md` and every variant's scores to `judged.json`.
// Usage: node src/design/draw-main.ts <dir> [--runs N] [--no-judges]
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { EffectEx } from '@dxos/effect';

import * as Draw from './Draw.ts';
import * as SystemOne from './SystemOne.ts';

const Variants = Schema.Array(
  Schema.Struct({ variant: Schema.Struct({ name: Schema.String }), mermaid: Schema.String }),
);

const args = process.argv.slice(2);
const dir = args.find((arg) => !arg.startsWith('--'));
const runsIndex = args.indexOf('--runs');
const runs = runsIndex >= 0 ? Math.max(1, Number(args[runsIndex + 1] ?? 1)) : 1;
const judges = !args.includes('--no-judges') && SystemOne.available();

const program = Effect.gen(function* () {
  if (dir === undefined) {
    return yield* Effect.die(new Error('usage: draw-main.ts <dir> [--runs N] [--no-judges]'));
  }
  const variants = Schema.decodeUnknownSync(Variants)(JSON.parse(readFileSync(join(dir, 'diagrams.json'), 'utf8')));
  const judged = yield* Effect.forEach(
    variants,
    ({ variant, mermaid }) => Draw.judge(variant.name, mermaid, { runs, judges }),
    {
      concurrency: 4,
    },
  );
  const ranked = [...judged].sort((left, right) => (right.overall ?? -1) - (left.overall ?? -1));
  const winner = ranked[0];
  if (winner === undefined) {
    return yield* Effect.die(new Error('No diagram variants to draw.'));
  }
  writeFileSync(join(dir, 'diagram.mmd'), winner.mermaid);
  writeFileSync(join(dir, 'diagram.svg'), winner.svg);
  writeFileSync(
    join(dir, 'diagram-scores.md'),
    `${ranked.map(Draw.scoreTable).join('\n\n')}\n${judges ? '' : '\nJudges skipped (no TYPESAFE_API_KEY): layout objective only.\n'}`,
  );
  writeFileSync(
    join(dir, 'judged.json'),
    `${JSON.stringify(
      ranked.map(({ name, overall, scores, layout }) => ({ name, overall, scores, layout })),
      null,
      2,
    )}\n`,
  );
  for (const entry of ranked) {
    console.log(`${entry === winner ? '*' : ' '} ${entry.name.padEnd(20)} overall ${entry.overall?.toFixed(2) ?? '—'}`);
  }
});

// Without a key the judges are never asked, so the model layer is only built when it can answer.
const decisionModel = judges ? SystemOne.layer : SystemOne.refusing;

void EffectEx.runPromise(program.pipe(Effect.provide(decisionModel), Effect.orDie)).catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

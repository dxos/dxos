//
// Copyright 2026 DXOS.org
//

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';

import { type Dimension, meanScore, scoreWalkthrough } from '../src/walkthrough/score.ts';

/**
 * Scores walkthroughs against the patches they describe.
 *
 * Run with node's type stripping, which needs no build and no workspace install:
 *
 *   node --experimental-strip-types scripts/score-walkthrough.ts evals/walkthrough
 *   node --experimental-strip-types scripts/score-walkthrough.ts a.md a.patch --json
 *
 * A corpus directory holds one folder per pull request: `diff.patch` plus a `*.md` per prompt
 * iteration, so one run prints the whole results table rather than a score at a time.
 */

type Row = { corpus: string; variant: string; correctness: Dimension[]; readability: Dimension[] };

const scorePair = (corpus: string, variant: string, body: string, patch: string): Row => ({
  corpus,
  variant,
  ...scoreWalkthrough(body, patch),
});

const readCorpus = (root: string): Row[] =>
  readdirSync(root)
    .filter((entry) => statSync(join(root, entry)).isDirectory())
    .flatMap((entry) => {
      const directory = join(root, entry);
      const patch = readFileSync(join(directory, 'diff.patch'), 'utf8');
      return readdirSync(directory)
        .filter((file) => file.endsWith('.md'))
        .sort()
        .map((file) => scorePair(entry, basename(file, '.md'), readFileSync(join(directory, file), 'utf8'), patch));
    });

const percent = (value: number): string => `${Math.round(value * 100)}`.padStart(3);

/** One line per dimension, then the means: the shape a report table is pasted from. */
const render = (rows: Row[]): string => {
  const names = [...rows[0].correctness, ...rows[0].readability].map((dimension) => dimension.name);
  const variants = [...new Set(rows.map((row) => row.variant))];
  const width = Math.max(...names.map((name) => name.length), 12);
  const lines = [
    ['dimension'.padEnd(width), ...variants.map((variant) => variant.padStart(6))].join(' | '),
    ['-'.repeat(width), ...variants.map(() => '------')].join(' | '),
  ];
  for (const name of names) {
    const marks = variants.map((variant) => {
      const dimensions = rows
        .filter((row) => row.variant === variant)
        .flatMap((row) => [...row.correctness, ...row.readability].filter((dimension) => dimension.name === name));
      return percent(meanScore(dimensions)).padStart(6);
    });
    lines.push([name.padEnd(width), ...marks].join(' | '));
  }
  for (const [label, pick] of [
    ['CORRECTNESS', (row: Row) => row.correctness],
    ['READABILITY', (row: Row) => row.readability],
  ] as const) {
    const marks = variants.map((variant) =>
      percent(
        meanScore(
          rows
            .filter((row) => row.variant === variant)
            .flatMap((row) => [{ name: label, score: meanScore(pick(row)), sampled: 1, evidence: [] }]),
        ),
      ).padStart(6),
    );
    lines.push([label.padEnd(width), ...marks].join(' | '));
  }

  return lines.join('\n');
};

/** What each dimension scored on, which is the half of the output a prompt gets fixed from. */
const renderEvidence = (rows: Row[]): string =>
  rows
    .flatMap((row) => [
      `\n${row.corpus} / ${row.variant}`,
      ...[...row.correctness, ...row.readability]
        .filter((dimension) => dimension.score < 1 && dimension.evidence.length > 0)
        .map((dimension) => `  ${dimension.name} ${percent(dimension.score)}: ${dimension.evidence.join(', ')}`),
    ])
    .join('\n');

const args = process.argv.slice(2);
// Flags are filtered out of the positionals rather than taken by position: a corpus run passes one
// path and a pair run two, so a positional slot would swallow the first flag.
const flags = args.filter((argument) => argument.startsWith('--'));
const [first, second] = args.filter((argument) => !argument.startsWith('--'));
if (!first) {
  console.error('usage: score-walkthrough.ts <corpus-dir> | <walkthrough.md> <diff.patch> [--json] [--evidence]');
  process.exit(2);
}

const rows = statSync(first).isDirectory()
  ? readCorpus(first)
  : [scorePair(basename(first), 'single', readFileSync(first, 'utf8'), readFileSync(second, 'utf8'))];

if (flags.includes('--json')) {
  console.log(JSON.stringify(rows, null, 2));
} else {
  console.log(render(rows));
  if (flags.includes('--evidence')) {
    console.log(renderEvidence(rows));
  }
}

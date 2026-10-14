//
// Copyright 2026 DXOS.org
//

import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

/**
 * Prepares blind packets for the LLM judge, and aggregates its verdicts.
 *
 *   node --experimental-strip-types scripts/judge-packet.ts prepare evals/walkthrough evals/judge
 *   node --experimental-strip-types scripts/judge-packet.ts report evals/judge
 *
 * The variants are copied under opaque letters and the mapping is kept out of the packet, because a
 * judge told which document came from the newer prompt grades the label.
 */

/** Deterministic per fixture, so a re-prepared packet keeps the same letters as its verdicts. */
const shuffle = <T>(items: T[], seed: string): T[] => {
  const ordered = items.map((item, index) => ({
    item,
    key: createHash('sha256').update(`${seed}:${index}`).digest('hex'),
  }));
  ordered.sort((left, right) => left.key.localeCompare(right.key));
  return ordered.map((entry) => entry.item);
};

const LETTERS = ['A', 'B', 'C', 'D', 'E'];

const prepare = (corpus: string, out: string): void => {
  mkdirSync(out, { recursive: true });
  const key: Record<string, Record<string, string>> = {};
  for (const fixture of readdirSync(corpus).filter((entry) => statSync(join(corpus, entry)).isDirectory())) {
    const from = join(corpus, fixture);
    const to = join(out, fixture);
    mkdirSync(to, { recursive: true });
    copyFileSync(join(from, 'diff.patch'), join(to, 'diff.patch'));
    const variants = shuffle(
      readdirSync(from).filter((file) => file.endsWith('.md')),
      fixture,
    );
    key[fixture] = {};
    variants.forEach((file, index) => {
      const letter = LETTERS[index];
      key[fixture][letter] = basename(file, '.md');
      copyFileSync(join(from, file), join(to, `${letter}.md`));
    });
  }
  writeFileSync(join(out, 'key.json'), JSON.stringify(key, null, 2));
  console.log(`prepared ${Object.keys(key).length} packets in ${out}`);
};

type Verdict = { order: number; why: number; load: number; trust: number; reasons?: Record<string, string> };

/** Averages the judge's 1-5 marks per variant, after mapping letters back through the key. */
const report = (out: string): void => {
  const key: Record<string, Record<string, string>> = JSON.parse(readFileSync(join(out, 'key.json'), 'utf8'));
  const totals: Record<string, { order: number[]; why: number[]; load: number[]; trust: number[] }> = {};
  let graded = 0;
  for (const [fixture, letters] of Object.entries(key)) {
    const path = join(out, fixture, 'verdict.json');
    if (!existsSync(path)) {
      console.error(`missing verdict: ${path}`);
      continue;
    }
    const verdicts: Record<string, Verdict> = JSON.parse(readFileSync(path, 'utf8'));
    for (const [letter, verdict] of Object.entries(verdicts)) {
      const variant = letters[letter];
      totals[variant] ??= { order: [], why: [], load: [], trust: [] };
      for (const dimension of ['order', 'why', 'load', 'trust'] as const) {
        totals[variant][dimension].push(verdict[dimension]);
      }
      graded++;
    }
  }

  const mean = (marks: number[]): string => (marks.reduce((sum, mark) => sum + mark, 0) / marks.length).toFixed(2);
  console.log(['variant'.padEnd(14), 'order', '  why', ' load', 'trust', ' mean'].join(' | '));
  for (const [variant, marks] of Object.entries(totals)) {
    const all = [...marks.order, ...marks.why, ...marks.load, ...marks.trust];
    console.log(
      [
        variant.padEnd(14),
        mean(marks.order).padStart(5),
        mean(marks.why).padStart(5),
        mean(marks.load).padStart(5),
        mean(marks.trust).padStart(5),
        mean(all).padStart(5),
      ].join(' | '),
    );
  }
  console.log(`\n${graded} documents graded`);
};

const [verb, ...rest] = process.argv.slice(2);
if (verb === 'prepare') {
  prepare(rest[0], rest[1]);
} else if (verb === 'report') {
  report(rest[0]);
} else {
  console.error('usage: judge-packet.ts prepare <corpus> <out> | report <out>');
  process.exit(2);
}

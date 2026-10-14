#!/usr/bin/env bun
//
// Copyright 2026 DXOS.org
//

// Calibrate the System One checker the way it actually runs: on the whole file, with the context
// each rule declares, rather than on the bare hunk `calibrate.ts` sends. Each hunk's file is read
// at the commit its reviewer commented on and the hunk stands in for `diff`; the other kinds are
// fetched from the working tree, the nearest available approximation of the repo at that commit.
// Because the reviewer's line is known, the run also measures location: which segment the model
// picks with the checker's segments, with finer ones, and with a second choice inside the first.
//
// Usage: bun calibrate-context.ts [--dry-run] [--out=CALIBRATION-CONTEXT.md]   (needs TYPESAFE_API_KEY, GITHUB_TOKEN)
//        bun calibrate-context.ts --from-json                                    (rebuild from saved results)

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { discoverRules } from '../../../skills/agentic-review/lib/discover.ts';
import { repoRoot } from '../../../skills/agentic-review/lib/git.ts';
import { type Rule } from '../../../skills/agentic-review/lib/mdl.ts';
import { estimateTokens, packQuestions } from '../../../skills/agentic-review/lib/system-one/budget.ts';
import {
  type BuiltState,
  buildFileStates,
  type LocationOption,
  PRICE_PER_MILLION,
} from '../../../skills/agentic-review/lib/system-one/checker.ts';
import { type Answer, type Question, makeClient } from '../../../skills/agentic-review/lib/system-one/client.ts';
import {
  type QuestionInstructions,
  locationQuestion,
  verdictQuestion,
} from '../../../skills/agentic-review/lib/system-one/questions.ts';
import { MAX_SEGMENT_LINES, segmentLines } from '../../../skills/agentic-review/lib/system-one/source.ts';
import { type Comment, loadLabels, mean, pct, rate } from './dataset.ts';

const { values } = parseArgs({
  options: {
    'out': { type: 'string', default: 'CALIBRATION-CONTEXT.md' },
    'dry-run': { type: 'boolean', default: false },
    'from-json': { type: 'boolean', default: false },
  },
});
const here = dirname(fileURLToPath(import.meta.url));
const root = repoRoot();
const jsonPath = join(here, values.out.replace(/\.md$/, '.json'));

/** Longest segment in the coarser of the two segmentations compared, the checker's former default. */
const COARSE_SEGMENT_LINES = 40;

/** Lines the second choice cuts the first one into. */
const REFINE_SEGMENT_LINES = 5;

/** A chosen range counts as a hit when the reviewer's line is within this many lines of it. */
const HIT_TOLERANCE = 3;

type Located = { start: number; end: number; hit: boolean };

/** One rule's answers on one hunk's file. */
type Result = {
  rule: string;
  hunk: string;
  own: boolean;
  probability: number;
  coarse?: Located;
  fine?: Located;
  refined?: Located;
};

type Entry = { id: string; question: Question<QuestionInstructions>; rule: Rule; kind: 'verdict' | 'coarse' | 'fine' };

const rules = discoverRules(root).filter((rule) => rule.systemOne && rule.unit === 'file');
const { positives, hunks } = loadLabels(here, rules);
const calibrated = rules.filter((rule) => positives.has(rule.id));

/** Rules grouped by the context kinds they declare, as the checker groups them. */
const groups = [...Map.groupBy(calibrated, (rule) => [...rule.context].sort().join(',')).values()].map((list) => ({
  kinds: [...list[0].context].sort(),
  rules: list,
}));

/** The file a comment was made on, at the commit it was made on; cached under `files/`. */
const fileAt = async (comment: Comment): Promise<string | null> => {
  const sha = comment.original_commit_id;
  if (!sha) {
    return null;
  }
  const cached = join(here, 'files', sha, comment.path);
  if (existsSync(cached)) {
    return readFileSync(cached, 'utf8');
  }
  const response = await fetch(
    `https://api.github.com/repos/dxos/dxos/contents/${comment.path.split('/').map(encodeURIComponent).join('/')}?ref=${sha}`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.GITHUB_TOKEN ?? ''}`,
        'Accept': 'application/vnd.github.raw+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'dxos-architecture-rules-calibration',
      },
    },
  );
  if (!response.ok) {
    return null;
  }
  const text = await response.text();
  mkdirSync(dirname(cached), { recursive: true });
  writeFileSync(cached, text);
  return text;
};

const within = (option: { start?: number; end?: number }, line: number): boolean =>
  option.start !== undefined && option.end !== undefined && line >= option.start && line <= option.end;

const located = (option: LocationOption | undefined, line: number | null | undefined): Located | undefined =>
  option?.start !== undefined && option.end !== undefined && line
    ? {
        start: option.start,
        end: option.end,
        hit: line >= option.start - HIT_TOLERANCE && line <= option.end + HIT_TOLERANCE,
      }
    : undefined;

/** Location options as the checker words them. */
const optionsFor = (segments: readonly LocationOption[]): Record<string, string> =>
  Object.fromEntries(
    segments.map((segment) => [segment.id, `lines ${segment.start}-${segment.end}: ${segment.label}`]),
  );

/** Segments of the lines `start..end` of `lines`, at most `maxLines` long. */
const segmentsOf = (lines: readonly string[], start: number, end: number, maxLines: number): LocationOption[] =>
  segmentLines(lines.slice(start - 1, end), start, maxLines);

const results: Result[] = [];
let inputTokens = 0;
let estimated = 0;
let skipped = 0;

if (values['from-json']) {
  const saved: Result[] = JSON.parse(readFileSync(jsonPath, 'utf8'));
  results.push(...saved);
} else {
  const client = values['dry-run'] ? null : makeClient({ apiKey: process.env.TYPESAFE_API_KEY, concurrency: 8 });
  const evaluate = async (state: BuiltState['state'], entries: readonly { id: string; question: Question }[]) => {
    const { batches } = packQuestions(estimateTokens(state), [...entries]);
    const answers: Record<string, Answer> = {};
    for (const batch of batches) {
      estimated += estimateTokens(state) + estimateTokens(batch.map((entry) => entry.question));
      if (!client) {
        continue;
      }
      const response = await client.evaluate(
        state,
        Object.fromEntries(batch.map((entry) => [entry.id, entry.question])),
      );
      inputTokens += response.usage?.input_tokens ?? 0;
      Object.assign(answers, response.answers ?? {});
    }
    return answers;
  };

  await Promise.all(
    [...hunks.values()].map(async ({ comment, rules: own }) => {
      const text = await fileAt(comment);
      if (text === null) {
        skipped++;
        return;
      }
      const lines = text.split(/\r?\n/);
      const line = comment.original_line;
      for (const group of groups) {
        const built = buildFileStates({
          root,
          file: comment.path,
          base: null,
          kinds: group.kinds,
          text,
          fetched: { diff: comment.diff_hunk },
        });
        const window =
          built.find(
            (candidate) =>
              line && within({ start: candidate.segments[0]?.start, end: candidate.segments.at(-1)?.end }, line),
          ) ?? built[0];
        const first = window.segments[0]?.start ?? 1;
        const last = window.segments.at(-1)?.end ?? lines.length;
        const coarse = segmentsOf(lines, first, last, COARSE_SEGMENT_LINES);
        const fine = segmentsOf(lines, first, last, MAX_SEGMENT_LINES);
        const entries: Entry[] = group.rules.flatMap((rule, index): Entry[] => [
          { id: `v${index}`, question: verdictQuestion(rule), rule, kind: 'verdict' },
          ...(own.has(rule.id) && line && fine.length > 1
            ? [
                {
                  id: `c${index}`,
                  question: locationQuestion(rule, optionsFor(coarse)),
                  rule,
                  kind: 'coarse' as const,
                },
                { id: `f${index}`, question: locationQuestion(rule, optionsFor(fine)), rule, kind: 'fine' as const },
              ]
            : []),
        ]);
        const answers = await evaluate(window.state, entries);
        const byRule = new Map<string, Result>();
        for (const entry of entries) {
          const answer = answers[entry.id];
          const result = byRule.get(entry.rule.id) ?? {
            rule: entry.rule.id,
            hunk: comment.url,
            own: own.has(entry.rule.id),
            probability: NaN,
          };
          if (entry.kind === 'verdict' && answer?.type === 'noul') {
            result.probability = answer.noul;
          } else if (entry.kind === 'coarse' && answer?.type === 'choice') {
            result.coarse = located(
              coarse.find((segment) => segment.id === answer.choice),
              line,
            );
          } else if (entry.kind === 'fine' && answer?.type === 'choice') {
            result.fine = located(
              fine.find((segment) => segment.id === answer.choice),
              line,
            );
          }
          byRule.set(entry.rule.id, result);
        }

        // Second choice: cut the first choice into short runs and ask again on the same state.
        const refine = [...byRule.values()]
          .filter((result) => result.coarse && result.coarse.end - result.coarse.start + 1 > REFINE_SEGMENT_LINES)
          .map((result) => {
            const rule = group.rules.find((candidate) => candidate.id === result.rule);
            const coarse = result.coarse;
            const options = coarse ? segmentsOf(lines, coarse.start, coarse.end, REFINE_SEGMENT_LINES) : [];
            return { result, rule, options };
          })
          .filter(
            (item): item is { result: Result; rule: Rule; options: LocationOption[] } =>
              Boolean(item.rule) && item.options.length > 1,
          );
        if (refine.length > 0) {
          const refineAnswers = await evaluate(
            window.state,
            refine.map(({ rule, options }, index) => ({
              id: `r${index}`,
              question: locationQuestion(rule, optionsFor(options)),
            })),
          );
          refine.forEach(({ result, options }, index) => {
            const answer = refineAnswers[`r${index}`];
            const choice = answer?.type === 'choice' ? answer.choice : undefined;
            result.refined = located(
              options.find((option) => option.id === choice),
              line,
            );
          });
        }
        for (const result of byRule.values()) {
          result.refined ??= result.coarse;
          results.push(result);
        }
      }
    }),
  );
  if (values['dry-run']) {
    console.log(
      `dry run: ${hunks.size} hunks (${skipped} files unavailable), ${groups.length} context groups, ~${(estimated / 1e6).toFixed(1)}M tokens, ~$${((estimated / 1e6) * PRICE_PER_MILLION).toFixed(2)}`,
    );
    process.exit(0);
  }
  writeFileSync(jsonPath, `${JSON.stringify(results, null, 1)}\n`);
}

//
// Report.
//

/** Scores from the bare-hunk run (`calibrate.ts`), when present, for the side-by-side columns. */
const bare: Record<string, { own: number[]; other: number[] }> = existsSync(join(here, 'CALIBRATION.json'))
  ? JSON.parse(readFileSync(join(here, 'CALIBRATION.json'), 'utf8'))
  : {};

const scored = results.filter((result) => !Number.isNaN(result.probability));
const byRule = Map.groupBy(scored, (result) => result.rule);
const withContext = new Set(calibrated.filter((rule) => rule.context.length > 0).map((rule) => rule.id));
const side = (ids: (id: string) => boolean) => {
  const rows = scored.filter((result) => ids(result.rule));
  const own = rows.filter((result) => result.own).map((result) => result.probability);
  const other = rows.filter((result) => !result.own).map((result) => result.probability);
  const bareOwn = Object.entries(bare).flatMap(([id, scores]) => (ids(id) && byRule.has(id) ? scores.own : []));
  const bareOther = Object.entries(bare).flatMap(([id, scores]) => (ids(id) && byRule.has(id) ? scores.other : []));
  return { own, other, bareOwn, bareOther };
};
const summaryRow = (label: string, { own, other, bareOwn, bareOther }: ReturnType<typeof side>, threshold: number) =>
  `| ${label} | ${threshold} | ${pct(rate(bareOwn, threshold))} → ${pct(rate(own, threshold))} | ${pct(rate(bareOther, threshold))} → ${pct(rate(other, threshold))} |`;

const locations = (pick: (result: Result) => Located | undefined) => {
  const list = scored
    .filter((result) => result.own)
    .map(pick)
    .filter((value): value is Located => Boolean(value));
  return {
    count: list.length,
    hit: list.filter((value) => value.hit).length / (list.length || NaN),
    span: mean(list.map((value) => value.end - value.start + 1)),
  };
};
const coarseHits = locations((result) => result.coarse);
const fineHits = locations((result) => result.fine);
const refinedHits = locations((result) => result.refined);

const report = [
  '# System One calibration with context',
  '',
  `Each rule's verdict was asked on the whole file its hunks come from, read at the commit the reviewer commented on, with the rule's declared context: ${hunks.size} hunks${skipped ? ` (${skipped} files no longer retrievable)` : ''}, ${calibrated.length} rules, ${groups.length} context groups, $${((inputTokens / 1e6) * PRICE_PER_MILLION).toFixed(2)} in input tokens.`,
  "The hunk stands in for `diff`; every other kind is fetched from today's tree, so `siblings`, `importers` and `package` are close to, not exactly, what the reviewer saw. A rule's own hunks are positives; other rules' hunks are presumed clean for it.",
  '',
  '## Verdicts: bare hunk → whole file with context',
  '',
  '| Rules | Threshold | Recall on own hunks | Flag rate on other hunks |',
  '| ----- | --------- | ------------------- | ------------------------ |',
  ...[0.5, 0.8].flatMap((threshold) => [
    summaryRow(
      `declaring context (${withContext.size})`,
      side((id) => withContext.has(id)),
      threshold,
    ),
    summaryRow(
      `declaring none (${calibrated.length - withContext.size})`,
      side((id) => !withContext.has(id)),
      threshold,
    ),
  ]),
  '',
  '## Location',
  '',
  `On each rule's own hunks, whether the chosen range holds the reviewer's line (within ${HIT_TOLERANCE} lines), and how long that range is.`,
  '',
  '| Method | Answers | Hit rate | Mean span (lines) |',
  '| ------ | ------- | -------- | ----------------- |',
  `| Segments up to ${COARSE_SEGMENT_LINES} lines | ${coarseHits.count} | ${pct(coarseHits.hit)} | ${coarseHits.span.toFixed(1)} |`,
  `| Segments up to ${MAX_SEGMENT_LINES} lines (the checker's default) | ${fineHits.count} | ${pct(fineHits.hit)} | ${fineHits.span.toFixed(1)} |`,
  `| Second choice within the first (${REFINE_SEGMENT_LINES}-line runs) | ${refinedHits.count} | ${pct(refinedHits.hit)} | ${refinedHits.span.toFixed(1)} |`,
  '',
  '## Per rule',
  '',
  '| Rule | Context | Own hunks | Mean p own: bare → context | Mean p other: bare → context |',
  '| ---- | ------- | --------- | -------------------------- | ---------------------------- |',
  ...calibrated
    .filter((rule) => byRule.has(rule.id))
    .map((rule) => {
      const list = byRule.get(rule.id) ?? [];
      const own = list.filter((result) => result.own).map((result) => result.probability);
      const other = list.filter((result) => !result.own).map((result) => result.probability);
      const was = bare[rule.id] ?? { own: [], other: [] };
      return {
        rule,
        own,
        line: `| \`${rule.id}\` | ${rule.context.join(', ') || '—'} | ${own.length} | ${mean(was.own).toFixed(2)} → ${mean(own).toFixed(2)} | ${mean(was.other).toFixed(2)} → ${mean(other).toFixed(2)} |`,
        separation: mean(own) - mean(other),
      };
    })
    .sort((left, right) => right.separation - left.separation)
    .map(({ line }) => line),
  '',
];
writeFileSync(join(here, values.out), report.join('\n'));
console.log(report.slice(0, 26).join('\n'));

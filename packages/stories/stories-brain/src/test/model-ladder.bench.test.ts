//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { log } from '@dxos/log';
import { Message } from '@dxos/types';

import {
  type LadderResult,
  type ModelVariant,
  buildGoldPoints,
  classifyTags,
  draftReply,
  fixtureExists,
  gradeDraft,
  gradeSummary,
  groupThreads,
  loadFixtureMessages,
  resolveJudge,
  runLadder,
  selectVariants,
  spamAgreement,
  summarizeMessage,
  summarizeThread,
  tagJaccard,
  trackProgress,
  writeResponses,
  writeResults,
} from '../testing/harness';
import { JUDGE, LADDER_N, LADDER_REFERENCE, LADDER_TASKS, LADDER_TOLERANCE } from './defs';

// The model-ladder experiment: for each task, run the whole ladder (open-weight tiers + haiku, the
// bar) over the same messages, measure latency, and grade accuracy — labeling deterministically vs
// haiku, summaries + drafts via the opus judge. The report lines accuracy up against latency + size
// so we can name, per task, the smallest model that clears the bar.

/** Approximate parameter scale per model, for the size axis of the report. */
const SIZE: Record<string, string> = {
  'llama-3.2-3b': '3B',
  'qwen3-8b': '8B',
  'gemma-4-12b': '12B',
  'gpt-oss-20b': '20B',
  'qwen3-30b': '30B MoE',
  'claude-haiku': 'premier',
  'claude-sonnet': 'premier',
  'claude-opus': 'premier',
};
const sizeOf = (model: string): string => SIZE[model] ?? '?';

type Row = {
  readonly task: string;
  readonly model: string;
  readonly reasoning: boolean;
  readonly size: string;
  readonly n: number;
  /** Primary 0..1 accuracy for the task (labeling: spamF1+tagJaccard; summary: coverage; draft: overall). */
  readonly accuracy: number;
  readonly metrics: Record<string, number>;
  readonly latencyP50: number;
  readonly latencyP95: number;
  readonly throughput: number;
};

const round = (value: number): number => Math.round(value * 1000) / 1000;
const mean = (values: readonly number[]): number =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;

/** Concatenated thread text — the grounding source for a thread summary's gold + faithfulness. */
const threadText = (messages: readonly Message.Message[]): string =>
  messages.map((message) => Message.extractText(message)).join('\n\n');

describe.skipIf(!fixtureExists())('model ladder — open-weight vs premier, per task', () => {
  test(
    'labeling / summaries / drafts across the ladder',
    async ({ expect }) => {
      const variants = selectVariants();
      const judge = resolveJudge(JUDGE);
      const reference = variants.find((variant) => variant.name.includes(LADDER_REFERENCE)) ?? variants.at(-1)!;
      const messages = loadFixtureMessages().slice(0, LADDER_N);
      const tasks = LADDER_TASKS
        ? LADDER_TASKS.split(',').map((task) => task.trim())
        : ['labeling', 'summarize-messages', 'summarize-threads', 'drafts'];

      log.info('model ladder', {
        models: variants.map((variant) => variant.name),
        reference: reference.name,
        judge: judge.name,
        messages: messages.length,
        tasks,
      });

      const rows: Row[] = [];
      const rowOf = (
        task: string,
        result: LadderResult<unknown, unknown>,
        accuracy: number,
        metrics: Record<string, number>,
        n: number,
      ): Row => ({
        task,
        model: result.model,
        reasoning: result.reasoning,
        size: sizeOf(result.model),
        n,
        accuracy: round(accuracy),
        metrics,
        latencyP50: result.latency.p50,
        latencyP95: result.latency.p95,
        throughput: result.latency.throughput,
      });

      // (a) Labeling — spam + topic tags; scored deterministically against the reference model.
      if (tasks.includes('labeling')) {
        const progress = trackProgress('ladder:labeling', variants.length * messages.length);
        const ladder = await runLadder({
          variants,
          items: messages,
          task: (message, variant) => classifyTags(message, variant),
          onItem: () => progress.advance(),
        });
        progress.done();
        const referenceTags = ladder.find((entry) => entry.model === reference.name)!.runs.map((run) => run.output);
        for (const entry of ladder) {
          const modelTags = entry.runs.map((run) => run.output);
          const spam = spamAgreement(modelTags, referenceTags);
          const jaccard = tagJaccard(modelTags, referenceTags);
          rows.push(
            rowOf(
              'labeling',
              entry,
              (spam.f1 + jaccard) / 2,
              {
                spamAccuracy: round(spam.accuracy),
                spamF1: round(spam.f1),
                tagJaccard: round(jaccard),
              },
              messages.length,
            ),
          );
        }
      }

      // (c1) Message summaries — coverage + faithfulness vs the message's own key points (opus judge).
      if (tasks.includes('summarize-messages')) {
        log.info('building message gold points', { messages: messages.length });
        const golds: string[][] = [];
        for (const message of messages) {
          golds.push(await buildGoldPoints('this email', Message.extractText(message), judge));
        }
        const progress = trackProgress('ladder:summarize-messages', variants.length * messages.length);
        const ladder = await runLadder({
          variants,
          items: messages,
          task: (message, variant) => summarizeMessage(message, variant),
          onItem: () => progress.advance(),
        });
        progress.done();
        for (const entry of ladder) {
          const coverage: number[] = [];
          const faithfulness: number[] = [];
          for (let index = 0; index < entry.runs.length; index++) {
            const score = await gradeSummary(
              Message.extractText(messages[index]),
              (entry.runs[index].output as { summary: string }).summary,
              golds[index],
              judge,
            );
            coverage.push(score.coverage);
            faithfulness.push(score.faithfulness);
          }
          rows.push(
            rowOf(
              'summarize-messages',
              entry,
              mean(coverage),
              {
                coverage: round(mean(coverage)),
                faithfulness: round(mean(faithfulness)),
              },
              entry.runs.length,
            ),
          );
        }
      }

      // (c2) Thread summaries — same metrics over grouped threads.
      if (tasks.includes('summarize-threads')) {
        const threads = groupThreads(messages);
        log.info('building thread gold points', { threads: threads.length });
        const golds: string[][] = [];
        for (const thread of threads) {
          golds.push(await buildGoldPoints('this thread', threadText(thread.messages), judge));
        }
        const progress = trackProgress('ladder:summarize-threads', variants.length * threads.length);
        const ladder = await runLadder({
          variants,
          items: threads,
          task: (thread, variant) => summarizeThread(thread, variant),
          onItem: () => progress.advance(),
        });
        progress.done();
        for (const entry of ladder) {
          const coverage: number[] = [];
          const faithfulness: number[] = [];
          for (let index = 0; index < entry.runs.length; index++) {
            const score = await gradeSummary(
              threadText(threads[index].messages),
              (entry.runs[index].output as { summary: string }).summary,
              golds[index],
              judge,
            );
            coverage.push(score.coverage);
            faithfulness.push(score.faithfulness);
          }
          rows.push(
            rowOf(
              'summarize-threads',
              entry,
              mean(coverage),
              {
                coverage: round(mean(coverage)),
                faithfulness: round(mean(faithfulness)),
              },
              entry.runs.length,
            ),
          );
        }
      }

      // (d1) Drafts — reply quality rubric (opus judge) over the replyable messages.
      if (tasks.includes('drafts')) {
        const progress = trackProgress('ladder:drafts', variants.length * messages.length);
        const ladder = await runLadder({
          variants,
          items: messages,
          task: (message, variant) => draftReply(message, variant),
          onItem: () => progress.advance(),
        });
        progress.done();
        for (const entry of ladder) {
          const overall: number[] = [];
          const relevance: number[] = [];
          const correctness: number[] = [];
          const completeness: number[] = [];
          const tone: number[] = [];
          let scored = 0;
          for (let index = 0; index < entry.runs.length; index++) {
            const output = entry.runs[index].output as { draft: string; skipped: boolean };
            if (output.skipped) {
              continue; // Bulk/no-reply mail is correctly skipped — not a quality data point.
            }
            const score = await gradeDraft(Message.extractText(messages[index]), output.draft, judge);
            overall.push(score.overall);
            relevance.push(score.relevance);
            correctness.push(score.correctness);
            completeness.push(score.completeness);
            tone.push(score.tone);
            scored++;
          }
          rows.push(
            rowOf(
              'drafts',
              entry,
              mean(overall),
              {
                overall: round(mean(overall)),
                relevance: round(mean(relevance)),
                correctness: round(mean(correctness)),
                completeness: round(mean(completeness)),
                tone: round(mean(tone)),
              },
              scored,
            ),
          );
        }
      }

      writeResults('model-ladder', {
        name: 'model-ladder',
        generatedAt: new Date().toISOString(),
        reference: reference.name,
        judge: judge.name,
        tolerance: LADDER_TOLERANCE,
        messages: messages.length,
        models: variants.map((variant) => variant.name),
        tasks,
        rows,
      });
      writeResponses('model-ladder', renderReport(rows, variants, reference.name, judge.name));

      expect(rows.length).toBeGreaterThan(0);
    },
    12 * 60 * 60_000,
  );
});

/** Renders the per-task accuracy × latency × size matrix + the smallest-sufficient-tier recommendation. */
const renderReport = (
  rows: readonly Row[],
  variants: readonly ModelVariant[],
  reference: string,
  judge: string,
): { title: string; body: string }[] => {
  const order = variants.map((variant) => variant.name);
  const tasks = [...new Set(rows.map((row) => row.task))];
  const sections: { title: string; body: string }[] = [];

  const recommendations: string[] = [];
  for (const task of tasks) {
    const taskRows = rows
      .filter((row) => row.task === task)
      .sort((left, right) => order.indexOf(left.model) - order.indexOf(right.model));
    const referenceRow = taskRows.find((row) => row.model === reference);
    const bar = referenceRow?.accuracy ?? 0;
    const threshold = bar * LADDER_TOLERANCE;

    const metricKeys = [...new Set(taskRows.flatMap((row) => Object.keys(row.metrics)))];
    const header = `| model | size | accuracy | ${metricKeys.join(' | ')} | p50 ms | p95 ms | items/s |`;
    const rule = `| --- | --- | --- | ${metricKeys.map(() => '---').join(' | ')} | --- | --- | --- |`;
    const lines = taskRows.map((row) => {
      const clears = row.accuracy >= threshold ? '✓' : ' ';
      const metricCells = metricKeys.map((key) => (key in row.metrics ? row.metrics[key].toFixed(2) : '—'));
      return `| ${clears} ${row.model} | ${row.size} | ${row.accuracy.toFixed(2)} | ${metricCells.join(' | ')} | ${row.latencyP50} | ${row.latencyP95} | ${row.throughput} |`;
    });

    // Smallest-sufficient tier = first model in ladder order (ascending size) that clears the bar.
    const sufficient = taskRows.find((row) => row.accuracy >= threshold);
    recommendations.push(
      `- **${task}** — bar (${reference}) = ${bar.toFixed(2)}; smallest sufficient (≥${(LADDER_TOLERANCE * 100).toFixed(0)}%): ` +
        (sufficient
          ? `**${sufficient.model}** (${sufficient.size}, ${sufficient.latencyP50}ms p50)`
          : '**none — needs premier**'),
    );

    sections.push({ title: `Task: ${task}`, body: [header, rule, ...lines].join('\n') });
  }

  sections.unshift({
    title: `Recommendations (bar = ${reference}, judge = ${judge})`,
    body:
      'Smallest open-weight model whose accuracy is within tolerance of the bar, per task:\n\n' +
      recommendations.join('\n'),
  });
  return sections;
};

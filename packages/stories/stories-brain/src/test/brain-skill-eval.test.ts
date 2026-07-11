//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { log } from '@dxos/log';

import {
  type AgentEvalResult,
  FACT_STORE_FIXTURE,
  FIXTURE,
  type SkillMode,
  type VariantScore,
  buildGoldPoints,
  factEntities,
  factStoreFixtureExists,
  fixtureExists,
  loadFacts,
  loadFixtureMessages,
  renderComparison,
  resolveJudge,
  runAgentEval,
  scoreVariant,
  selectVariants,
  slugify,
  subjectCorpus,
  toRelative,
  trackProgress,
  writeResponses,
  writeResults,
} from '../testing/harness';
import { DEFAULT_SUBJECT, EVAL_SCORE, JUDGE, SKILL_MODES, SUBJECT } from './defs';

const ALL_MODES: readonly SkillMode[] = ['database', 'brain', 'rag', 'hybrid'];
const BASELINE_MODE: SkillMode = 'database';

// Which skill configurations to compare. `SKILL_MODES=database,brain` narrows the set.
const selectModes = (): readonly SkillMode[] => {
  if (!SKILL_MODES) {
    return ALL_MODES;
  }

  const names = SKILL_MODES.split(',').map((name) => name.trim());
  return ALL_MODES.filter((mode) => names.includes(mode));
};

/**
 * Evaluates whether the Brain skill (fact-store tools) or the RAG skill (vector retrieval) improves
 * the agent's answer to "summarize messages from <SUBJECT>", relative to the Database-only baseline.
 * For each model variant the same prompt runs once per skill mode, over the same message feed, with
 * the pre-computed fact-store fixture (brain) or a freshly-embedded vector index (rag) injected.
 *
 * A blind LLM-judge then grades every arm against the SAME ground truth — coverage of a gold
 * salient-point set and faithfulness to the source corpus — plus a blind pairwise vote vs. the
 * database baseline. Facts "help" iff a fact-backed arm beats the baseline on coverage without
 * losing faithfulness. Scores + the raw summaries are written side-by-side to `<name>.md`; disable
 * the (expensive) grading pass with `EVAL_SCORE=0`.
 */
describe.skipIf(!fixtureExists() || !factStoreFixtureExists())('brain vs. rag skill evaluation (multi-model)', () => {
  test(
    'summarize-from-subject across skill modes',
    async (ctx) => {
      const { expect } = ctx;
      const facts = loadFacts(FACT_STORE_FIXTURE);
      const messages = loadFixtureMessages();
      const entities = factEntities(facts);

      const resolveSubject = (): string => {
        if (SUBJECT) {
          return SUBJECT;
        }
        if (entities.has(slugify(DEFAULT_SUBJECT))) {
          return DEFAULT_SUBJECT;
        }
        const senderNames = messages.map((message) => message.sender.name).filter((name): name is string => !!name);
        const match = senderNames.find((name) => entities.has(slugify(name)));
        return match ?? senderNames[0] ?? 'the sender';
      };

      const subject = resolveSubject();
      const prompt = `summarize messages from ${subject}`;
      const subjectTokens = subject.toLowerCase().split(/\s+/).filter(Boolean);
      log.info('brain-vs-rag eval', {
        subject,
        subjectInFactStore: entities.has(slugify(subject)),
        facts: facts.length,
        entities: entities.size,
      });

      const variants = selectVariants();
      const modes = selectModes();
      const progress = trackProgress('brain-vs-rag-eval', variants.length * modes.length);
      const results: (AgentEvalResult & { subjectMentions: number; error?: string })[] = [];
      // Arms grouped by model so the judge can compare a model's modes against each other.
      const armsByModel = new Map<string, { mode: SkillMode; response: string }[]>();
      for (const variant of variants) {
        for (const mode of modes) {
          try {
            const result = await runAgentEval({ variant, mode, facts, messages, prompt }, ctx);
            const haystack = result.response.toLowerCase();
            const subjectMentions = subjectTokens.reduce(
              (count, token) => count + (haystack.includes(token) ? 1 : 0),
              0,
            );
            results.push({ ...result, subjectMentions });
            const arms = armsByModel.get(variant.name) ?? [];
            arms.push({ mode, response: result.response });
            armsByModel.set(variant.name, arms);
            log.info('eval result', {
              model: variant.name,
              mode,
              chars: result.responseChars,
              ms: result.durationMs,
              subjectMentions,
            });
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            log.warn('eval run failed', { model: variant.name, mode, error: message });
            results.push({
              model: variant.name,
              mode,
              prompt,
              response: '',
              responseChars: 0,
              durationMs: 0,
              subjectMentions: 0,
              error: message,
            });
            const arms = armsByModel.get(variant.name) ?? [];
            arms.push({ mode, response: '' });
            armsByModel.set(variant.name, arms);
          }
          progress.advance();
        }
      }
      progress.done();

      // Blind-judge scoring pass: grade every arm against one gold set + corpus, then render the
      // summaries and their scores side-by-side. Skipped (cheap mode) with EVAL_SCORE=0.
      const scores: VariantScore[] = [];
      let goldPoints: readonly string[] = [];
      let judgeName: string | undefined;
      if (EVAL_SCORE) {
        const judge = resolveJudge(JUDGE);
        judgeName = judge.name;
        const corpus = subjectCorpus(subject, messages);
        goldPoints = await buildGoldPoints(subject, corpus, judge);
        log.info('judge gold set', { judge: judge.name, goldPoints: goldPoints.length, corpusChars: corpus.length });
        const scoreProgress = trackProgress('brain-vs-rag-score', armsByModel.size);
        for (const [model, arms] of armsByModel) {
          scores.push(await scoreVariant({ model, subject, corpus, goldPoints, arms, judge, baseline: BASELINE_MODE }));
          scoreProgress.advance();
        }
        scoreProgress.done();
        writeResponses(
          'brain-vs-rag-eval',
          renderComparison({ subject, prompt, judge: judge.name, goldPoints, scores, baseline: BASELINE_MODE }),
        );
      }

      writeResults('brain-vs-rag-eval', {
        name: 'brain-vs-rag-eval',
        generatedAt: new Date().toISOString(),
        subject,
        subjectInFactStore: entities.has(slugify(subject)),
        prompt,
        judge: judgeName,
        baseline: BASELINE_MODE,
        goldPoints,
        factStore: toRelative(FACT_STORE_FIXTURE),
        feed: toRelative(FIXTURE),
        factCount: facts.length,
        messages: messages.length,
        corpusSize: messages.length,
        modes,
        scores: scores.map(({ arms, ...rest }) => ({
          ...rest,
          arms: arms.map(({ response: _response, ...arm }) => arm),
        })),
        stats: results.map(({ response: _response, prompt: _prompt, ...rest }) => rest),
      });

      expect(results.length).toBe(variants.length * modes.length);
    },
    3 * 60 * 60_000,
  );
});

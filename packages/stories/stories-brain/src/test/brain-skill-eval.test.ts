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
  factEntities,
  factStoreFixtureExists,
  fixtureExists,
  loadFacts,
  loadFixtureMessages,
  runAgentEval,
  selectVariants,
  slugify,
  startResponseLog,
  toRelative,
  trackProgress,
  writeResults,
} from '../testing/harness';
import { DEFAULT_SUBJECT, SKILL_MODES, SUBJECT } from './defs';

const ALL_MODES: readonly SkillMode[] = ['database', 'brain', 'rag', 'hybrid'];

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
 * Both the response and a rough grounding signal (mentions of the subject) are written to JSON.
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
      // Responses stream to the sister markdown as each (model, mode) run completes.
      const responseLog = startResponseLog('brain-vs-rag-eval');
      const progress = trackProgress('brain-vs-rag-eval', variants.length * modes.length);
      const results: (AgentEvalResult & { subjectMentions: number; error?: string })[] = [];
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
            if (result.response.length > 0) {
              responseLog.append({ title: `${variant.name} · ${mode}`, body: result.response });
            }
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
          }
          progress.advance();
        }
      }
      progress.done();

      writeResults('brain-vs-rag-eval', {
        name: 'brain-vs-rag-eval',
        generatedAt: new Date().toISOString(),
        subject,
        subjectInFactStore: entities.has(slugify(subject)),
        prompt,
        factStore: toRelative(FACT_STORE_FIXTURE),
        feed: toRelative(FIXTURE),
        factCount: facts.length,
        messages: messages.length,
        corpusSize: messages.length,
        modes,
        stats: results.map(({ response: _response, prompt: _prompt, ...rest }) => rest),
      });

      expect(results.length).toBe(variants.length * modes.length);
    },
    3 * 60 * 60_000,
  );
});

//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { log } from '@dxos/log';

import {
  type AgentEvalResult,
  FACT_STORE_FIXTURE,
  type SkillMode,
  factEntities,
  factStoreFixtureExists,
  fixtureExists,
  loadFacts,
  loadFixtureMessages,
  runAgentEval,
  selectVariants,
  slugify,
  writeResults,
} from './harness';

// The Phase-2 subject: prefer "Nicole Gudmand" if she is an entity in the fact store, else fall back
// to the first message sender that is. Override with `SUBJECT`.
const PREFERRED_SUBJECT = 'Nicole Gudmand';

const ALL_MODES: readonly SkillMode[] = ['database', 'brain', 'brain-v2', 'rag'];

// Which skill configurations to compare. `SKILL_MODES=database,brain` narrows the set.
const selectModes = (): readonly SkillMode[] => {
  const raw = process.env.SKILL_MODES?.trim();
  if (!raw) {
    return ALL_MODES;
  }
  const names = raw.split(',').map((name) => name.trim());
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
        if (process.env.SUBJECT) {
          return process.env.SUBJECT;
        }
        if (entities.has(slugify(PREFERRED_SUBJECT))) {
          return PREFERRED_SUBJECT;
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
        }
      }

      writeResults('brain-vs-rag-eval', {
        name: 'brain-vs-rag-eval',
        generatedAt: new Date().toISOString(),
        subject,
        subjectInFactStore: entities.has(slugify(subject)),
        prompt,
        factCount: facts.length,
        corpusSize: messages.length,
        modes,
        results,
      });

      expect(results.length).toBe(variants.length * modes.length);
    },
    3 * 60 * 60_000,
  );
});

//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';
import { FactStore } from '@dxos/pipeline-rdf';

import {
  FACT_STORE_FIXTURE,
  FIXTURE,
  buildSubjectIndex,
  factStoreFixtureExists,
  factStoreLayer,
  fixtureExists,
  loadFacts,
  loadFixtureMessages,
  slugify,
  startResponseLog,
  toRelative,
  writeResults,
} from '../testing/harness';
import { DEFAULT_SUBJECT, SUBJECT as SUBJECT_OVERRIDE } from './defs';

// The subject to index. Defaults to Nicole Gudmand; override with `SUBJECT`.
const SUBJECT = SUBJECT_OVERRIDE ?? DEFAULT_SUBJECT;

// Finds every fact for a subject in the fact store (deterministic — no LLM), then follows those
// facts back to the source messages (the fact→source bridge). Writes the facts to JSON and the
// source messages to a sister markdown file.
describe.skipIf(!factStoreFixtureExists() || !fixtureExists())('find all facts for a subject', () => {
  test('lists every fact for the subject and resolves the source messages', async ({ expect }) => {
    const facts = loadFacts(FACT_STORE_FIXTURE);
    const messages = loadFixtureMessages();
    const slug = slugify(SUBJECT);

    // The exact-slug store query — the path the Brain skill's QueryFacts tool uses. Extractors slug
    // the same person differently, so this can miss; kept as an informational cross-check.
    const exactSlugFacts = await EffectEx.runPromise(
      Effect.gen(function* () {
        const store = yield* FactStore;
        return yield* store.query({ entity: slug });
      }).pipe(Effect.provide(factStoreLayer(facts))),
    );

    // Fact→source bridge with token-substring matching — the robust subject lookup + source messages.
    const retrieval = buildSubjectIndex(facts, messages).retrieve(SUBJECT, messages.length);

    log.info('subject facts', {
      subject: SUBJECT,
      slug,
      factCount: retrieval.facts.length,
      exactSlugFacts: exactSlugFacts.length,
      sourceMessages: retrieval.messages.length,
    });

    writeResults('subject-facts', {
      name: 'subject-facts',
      generatedAt: new Date().toISOString(),
      subject: SUBJECT,
      slug,
      factStore: toRelative(FACT_STORE_FIXTURE),
      feed: toRelative(FIXTURE),
      messages: messages.length,
      factCount: retrieval.facts.length,
      exactSlugFacts: exactSlugFacts.length,
      sourceMessageCount: retrieval.messages.length,
      facts: retrieval.facts,
      sources: retrieval.messages.map((message) => ({
        source: message.source,
        from: message.from,
        subject: message.subject,
      })),
    });

    // Markdown: the facts as readable sentences (the point of the test), then a brief excerpt of
    // each source message they were extracted from (grounding, not the full body).
    const responseLog = startResponseLog('subject-facts');
    responseLog.append({
      title: `Facts for ${SUBJECT} (${retrieval.facts.length})`,
      body: retrieval.facts.map((fact) => `- **${fact.subject}** ${fact.predicate} **${fact.object}**`).join('\n'),
    });
    for (const message of retrieval.messages) {
      const excerpt = message.text.length > 500 ? `${message.text.slice(0, 500)} …` : message.text;
      responseLog.append({ title: `Source — ${message.subject || message.source}`, body: excerpt });
    }

    expect(retrieval.facts.length).toBeGreaterThan(0);
    expect(retrieval.messages.length).toBeGreaterThan(0);
  });
});

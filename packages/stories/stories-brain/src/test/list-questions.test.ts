//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { log } from '@dxos/log';
import { type RDF } from '@dxos/pipeline-rdf';

import {
  FACT_STORE_FIXTURE,
  factStoreFixtureExists,
  loadFacts,
  startResponseLog,
  toRelative,
  writeResults,
} from '../testing/harness';

/** The display label for a term (entity surface form, else the literal). */
const termLabel = (term: RDF.Term): string => ('entity' in term ? (term.label ?? term.entity) : term.literal);

/** Renders a directive fact as a readable line, citing the source message. */
const renderFact = (fact: RDF.Fact): string =>
  `- **${termLabel(fact.assertion.subject)}** ${fact.assertion.predicate} **${termLabel(fact.assertion.object)}**` +
  ` _(${fact.attribution.source})_`;

// Lists the questions and requests captured in the fact store — the directive facts the illocution
// extraction emits (interrogative = question, imperative = request). Deterministic (no LLM); reads the
// saved fact-store fixture. Regenerate the fixture with `moon run stories-brain:facts` to populate
// illocution — a fact store built before that extraction has no directive facts.
describe.skipIf(!factStoreFixtureExists())('list questions and requests from the fact store', () => {
  test('lists every directive fact (question / request)', ({ expect }) => {
    const facts = loadFacts(FACT_STORE_FIXTURE);
    const directive = facts.filter((fact) => fact.illocution?.force === 'directive');
    const questions = directive.filter((fact) => fact.illocution?.mood === 'interrogative');
    const requests = directive.filter((fact) => fact.illocution?.mood === 'imperative');

    log.info('list-questions', {
      facts: facts.length,
      directive: directive.length,
      questions: questions.length,
      requests: requests.length,
    });

    writeResults('list-questions', {
      name: 'list-questions',
      generatedAt: new Date().toISOString(),
      factStore: toRelative(FACT_STORE_FIXTURE),
      factCount: facts.length,
      questionCount: questions.length,
      requestCount: requests.length,
      questions,
      requests,
    });

    const responseLog = startResponseLog('list-questions');
    responseLog.append({
      title: `Questions (${questions.length})`,
      body: questions.length ? questions.map(renderFact).join('\n') : '_(none — regenerate the fact store)_',
    });
    responseLog.append({
      title: `Requests (${requests.length})`,
      body: requests.length ? requests.map(renderFact).join('\n') : '_(none — regenerate the fact store)_',
    });

    // The fact store loads; question/request counts are informational (zero until the store is
    // regenerated with illocution extraction).
    expect(facts.length).toBeGreaterThan(0);
  });
});

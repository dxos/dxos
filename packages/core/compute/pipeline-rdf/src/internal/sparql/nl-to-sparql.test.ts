//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { SemanticIndexError } from '../../errors.ts';
import { queuedAiService } from '../../testing/index.ts';
import * as Ontology from '../../types/Ontology.ts';
import { generateSparql, sparqlPrompt } from './nl-to-sparql.ts';

const PEOPLE = `PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT DISTINCT ?person ?label WHERE { GRAPH ?g { ?person a <https://schema.org/Person> . OPTIONAL { ?person rdfs:label ?label } } }`;

describe('generateSparql', () => {
  it('grounds the prompt in the storage model and the store’s predicates', () => {
    const minted = Ontology.entry('mentors', {
      iri: 'https://dxos.org/semantic/brain/local/mentors',
      label: 'mentors',
    });
    const prompt = sparqlPrompt('show all people', [...Ontology.DEFAULT.entries, minted]);
    expect(prompt).toContain('GRAPH ?g');
    expect(prompt).toContain('<https://schema.org/Person>');
    expect(prompt).toContain('PREFIX sx: <https://dxos.org/semantic#>');
    expect(prompt).toContain('<https://dxos.org/semantic/brain/local/mentors> "mentors"');
    expect(prompt).toContain('Question: show all people');
  });

  it.effect(
    'returns the model’s SELECT once it parses',
    Effect.fnUntraced(function* () {
      const sparql = yield* generateSparql('show all people').pipe(
        Effect.provide(queuedAiService([{ sparql: `  ${PEOPLE}\n` }])),
      );
      expect(sparql).toBe(PEOPLE);
    }),
  );

  it.effect(
    'sends an unparsable answer back once with the error',
    Effect.fnUntraced(function* () {
      const prompts: unknown[] = [];
      const sparql = yield* generateSparql('show all people').pipe(
        Effect.provide(queuedAiService([{ sparql: 'SELECT ?x WHERE {' }, { sparql: PEOPLE }], prompts)),
      );
      expect(sparql).toBe(PEOPLE);
      expect(String(prompts[1])).toContain('previous answer was rejected');
    }),
  );

  it.effect(
    'fails when the retry is still not a SELECT',
    Effect.fnUntraced(function* () {
      const error = yield* generateSparql('delete everything').pipe(
        Effect.provide(queuedAiService([{ sparql: 'DELETE WHERE { ?s ?p ?o }' }, { sparql: 'ASK { ?s ?p ?o }' }])),
        Effect.flip,
      );
      expect(error).toBeInstanceOf(SemanticIndexError);
      expect(error.message).toContain('not a valid SELECT');
    }),
  );
});

//
// Copyright 2026 DXOS.org
//

import { Effect } from 'effect';
import { describe, expect, test } from '@effect/vitest';

import { Graph, Pipeline, Stages } from '../index';

describe('Graph', () => {
  test('successor detaches the prior graph', () => {
    const graph = Graph.empty();
    const next = graph.successor(graph.cloneStore());
    expect(next.attached).toBe(true);
    expect(graph.attached).toBe(false);
    expect(() => graph.successor(graph.cloneStore())).toThrow();
  });
});

describe('Pipeline stages', () => {
  test('sparqlConstruct builds a new graph', () =>
    Effect.gen(function* () {
      const graph = Graph.empty();
      const result = yield* Stages.sparqlConstruct({
        sparql: `
          CONSTRUCT { ?s ?p ?o }
          WHERE { VALUES (?s ?p ?o) { (<http://example.org/a> <http://example.org/p> "v") } }
        `,
      })(graph);
      expect(result.getQuads()).toHaveLength(1);
      expect(graph.attached).toBe(false);
    }).pipe(Effect.runPromise));

  test('sparqlMutation updates the store', () =>
    Effect.gen(function* () {
      const graph = Graph.empty();
      const updated = yield* Stages.sparqlMutation({
        sparql: `
          INSERT DATA { <http://example.org/a> <http://example.org/p> "v" . }
        `,
      })(graph);
      expect(updated.getQuads()).toHaveLength(1);
    }).pipe(Effect.runPromise));

  test('n3Reason infers subclass facts', () =>
    Effect.gen(function* () {
      const graph = Graph.fromQuads([]);
      const result = yield* Stages.n3Reason({
        rules: `
          @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
          @prefix : <http://example.org/socrates#> .
          :Socrates a :Human .
          :Human rdfs:subClassOf :Mortal .
          { ?S a ?A . ?A rdfs:subClassOf ?B . } => { ?S a ?B . } .
        `,
        merge: false,
      })(graph);
      const types = result
        .getQuads()
        .filter((quad) => quad.predicate.value.endsWith('#type'))
        .map((quad) => quad.object.value);
      expect(types).toContain('http://example.org/socrates#Mortal');
    }).pipe(Effect.runPromise));

  test('pipeline composes stages', () =>
    Effect.gen(function* () {
      const graph = Graph.empty();
      const result = yield* Pipeline.run(graph, [
        Stages.sparqlConstruct({
          sparql: `
            CONSTRUCT { ?s ?p ?o }
            WHERE { VALUES (?s ?p ?o) { (<http://example.org/a> <http://example.org/p> "v") } }
          `,
        }),
        Stages.sparqlMutation({
          sparql: `
            INSERT DATA { <http://example.org/b> <http://example.org/p> "v2" . }
          `,
        }),
      ]);
      expect(result.getQuads()).toHaveLength(2);
    }).pipe(Effect.runPromise));
});

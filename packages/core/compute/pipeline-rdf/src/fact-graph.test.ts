//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { buildFactGraph, factSourceFromFacts } from './fact-graph';
import { type Fact } from './types';

const mk = (id: string, subject: string, predicate: string, object: string): Fact => ({
  id,
  assertion: { subject: { entity: subject }, predicate, object: { entity: object } },
  factuality: { value: 'CT+', polarity: '+' },
  attribution: { source: `test:${id}`, generatedAtTime: '2026-06-30T00:00:00.000Z' },
  recordedAt: '2026-06-30T00:00:00.000Z',
  extractor: { id: 'test', model: 'test', version: '1' },
  sourceHash: id,
});

// Socrates-isa-man, man-is-mortal.
const SYLLOGISM = [mk('f1', 'socrates', 'is a', 'man'), mk('f2', 'man', 'is', 'mortal')];

const edgeKeys = (graph: { edges: { source: string; target: string }[] }) =>
  graph.edges.map((edge) => `${edge.source}->${edge.target}`).sort();

describe('buildFactGraph', () => {
  test('connects socrates → man → mortal at depth 2', ({ expect }) => {
    const graph = buildFactGraph('socrates', factSourceFromFacts(SYLLOGISM), { depth: 2 });
    expect(graph.nodes.map((node) => node.id).sort()).toEqual(['man', 'mortal', 'socrates']);
    expect(edgeKeys(graph)).toEqual(['man->mortal', 'socrates->man']);
    expect(graph.edges.find((edge) => edge.source === 'socrates')?.label).toBe('is a');
  });

  test("depth 1 stops at the root's direct facts", ({ expect }) => {
    const graph = buildFactGraph('socrates', factSourceFromFacts(SYLLOGISM), { depth: 1 });
    expect(edgeKeys(graph)).toEqual(['socrates->man']);
    expect(graph.nodes.map((node) => node.id).sort()).toEqual(['man', 'socrates']);
  });

  test('traverses backward as well (object → subject)', ({ expect }) => {
    const graph = buildFactGraph('mortal', factSourceFromFacts(SYLLOGISM), { depth: 2 });
    expect(edgeKeys(graph)).toEqual(['man->mortal', 'socrates->man']);
  });

  test('visits cycles and shared nodes once (no infinite loop)', ({ expect }) => {
    const cyclic = [mk('f1', 'a', 'knows', 'b'), mk('f2', 'b', 'knows', 'a')];
    const graph = buildFactGraph('a', factSourceFromFacts(cyclic), { depth: 5 });
    expect(graph.nodes.map((node) => node.id).sort()).toEqual(['a', 'b']);
    expect(edgeKeys(graph)).toEqual(['a->b', 'b->a']);
  });

  test('unknown / empty context yields an empty graph', ({ expect }) => {
    const source = factSourceFromFacts(SYLLOGISM);
    expect(buildFactGraph('plato', source)).toEqual({ nodes: [], edges: [] });
    expect(buildFactGraph('', source)).toEqual({ nodes: [], edges: [] });
  });
});

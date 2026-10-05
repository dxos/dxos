//
// Copyright 2026 DXOS.org
//

import type * as DecisionModel from 'effect/ai/DecisionModel';
import * as Effect from 'effect/Effect';
import { describe, expect, test } from 'vitest';

import * as EffectEx from '@dxos/effect/EffectEx';

import * as Cache from './Cache.ts';
import * as Compact from './Compact.ts';
import * as Design from './Design.ts';
import * as Graph from './Graph.ts';
import * as SystemOne from './SystemOne.ts';
import * as Text from './Text.ts';
import * as Zoom from './Zoom.ts';

const FILE = 'https://dxos.org/deus/file/';

const card = (path: string, overrides: Partial<Graph.NodeCard> = {}): Graph.NodeCard => ({
  iri: `${FILE}${path}`,
  label: path.split('/').pop()?.replace('.ts', '') ?? path,
  kind: 'class',
  path,
  package: `@dxos/${path.split('/')[1]}`,
  area: 'core',
  symbols: [],
  inDegree: 1,
  outDegree: 1,
  why: 'test',
  hops: 0,
  ...overrides,
});

const edge = (from: string, to: string, kind = 'imports'): Graph.Edge => ({
  from: `${FILE}${from}`,
  to: `${FILE}${to}`,
  kind,
});

describe('Text', () => {
  test('identifiers match prose', () => {
    const query = Text.query('How does the agent runtime wire its services?');
    expect(query.terms).toEqual(['agent', 'runtime', 'service']);
    expect(Text.match(query, 'packages/core/compute/agent-runtime/src/AgentService.ts')).toBeGreaterThan(0.9);
    expect(Text.match(query, 'packages/common/log/src/index.ts')).toBe(0);
  });
});

describe('Graph.prune', () => {
  test('a dropped relay becomes an edge between survivors', () => {
    const nodes = [
      { iri: 'a', score: 0.9 },
      { iri: 'b', score: 0.1 },
      { iri: 'c', score: 0.8 },
    ];
    const edges: Graph.Edge[] = [
      { from: 'a', to: 'b', kind: 'imports' },
      { from: 'b', to: 'c', kind: 'imports' },
    ];
    const { kept, edges: result } = Graph.prune(nodes, edges, { threshold: 0.5, budget: 10 });
    expect([...kept].sort()).toEqual(['a', 'c']);
    expect(result).toEqual([{ from: 'a', to: 'c', kind: Graph.RELAY, via: ['b'] }]);
  });

  test('a direct edge wins over a relay, and the budget keeps the best', () => {
    const nodes = [
      { iri: 'a', score: 0.9 },
      { iri: 'b', score: 0.6 },
      { iri: 'c', score: 0.8 },
    ];
    const edges: Graph.Edge[] = [
      { from: 'a', to: 'c', kind: 'imports' },
      { from: 'a', to: 'b', kind: 'imports' },
      { from: 'b', to: 'c', kind: 'imports' },
    ];
    const { kept, edges: result } = Graph.prune(nodes, edges, { threshold: 0, budget: 2 });
    expect([...kept].sort()).toEqual(['a', 'c']);
    expect(result).toEqual([{ from: 'a', to: 'c', kind: 'imports' }]);
  });

  test('excluded kinds do not connect survivors', () => {
    const { edges } = Graph.prune(
      [
        { iri: 'a', score: 1 },
        { iri: 'b', score: 1 },
      ],
      [{ from: 'a', to: 'b', kind: 'apiDependsOn' }],
      { threshold: 0, budget: 5, kinds: new Set(['imports']) },
    );
    expect(edges).toEqual([]);
  });
});

const candidates: Graph.Candidates = {
  prompt: 'how does the agent runtime wire its services?',
  explorer: 'test',
  seeds: [`${FILE}packages/agent/src/AgentService.ts`],
  nodes: [
    card('packages/agent/src/AgentService.ts', { label: 'AgentService', kind: 'EffectService' }),
    card('packages/agent/src/AgentLayer.ts', { label: 'AgentLayer', kind: 'EffectLayer' }),
    card('packages/agent/src/util.ts', { label: 'util', kind: 'function' }),
    card('packages/model/src/Model.ts', { label: 'Model', kind: 'EffectService' }),
    card('packages/log/src/log.ts', { label: 'log', kind: 'function' }),
  ],
  edges: [
    edge('packages/agent/src/AgentLayer.ts', 'packages/agent/src/AgentService.ts', 'providesService'),
    edge('packages/agent/src/AgentLayer.ts', 'packages/agent/src/util.ts'),
    edge('packages/agent/src/util.ts', 'packages/model/src/Model.ts'),
    edge('packages/agent/src/AgentLayer.ts', 'packages/log/src/log.ts'),
  ],
};

/** Relevant unless the card names a helper; the agent package is the focus; every relation kind matters; grouping by package. */
const scripted = SystemOne.scripted(({ state, decisions }): Record<string, DecisionModel.ProviderAnswer> => {
  const text = JSON.stringify(state);
  if ('grouping' in decisions) {
    return {
      grouping: {
        _tag: 'Classify',
        label: 'package',
        probabilities: { package: 0.7, area: 0.1, directory: 0.1, kind: 0.1 },
      },
    };
  }
  if ('focus' in decisions) {
    return {
      focus: {
        _tag: 'Classify',
        label: '@dxos/agent',
        probabilities: { '@dxos/agent': 0.5, '@dxos/model': 0.25, '@dxos/log': 0.25 },
      },
    };
  }
  const helper = /"name":"(util|log)"/.test(text);
  return { matters: { _tag: 'Probability', probability: helper ? 0.1 : 0.9 } };
});

describe('Zoom', () => {
  test('scores with the decision model, relays the dropped helper, and caches every answer', async () => {
    const cache = Cache.memory();
    const options = {
      prompt: candidates.prompt,
      candidates,
      scorer: 'system-one' as const,
      model: 'test',
      cache,
      threshold: 0.5,
      budget: 10,
    };
    const first = await EffectEx.runPromise(Zoom.zoom(options).pipe(Effect.provide(scripted)));
    expect(first.scored.nodes.filter((node) => node.kept).map((node) => node.label)).toEqual([
      'AgentService',
      'AgentLayer',
      'Model',
    ]);
    expect(first.scored.grouping).toBe('package');
    const kept = Zoom.keptEdges(first.scored);
    expect(kept).toContainEqual({
      from: `${FILE}packages/agent/src/AgentLayer.ts`,
      to: `${FILE}packages/model/src/Model.ts`,
      kind: Graph.RELAY,
      via: [`${FILE}packages/agent/src/util.ts`],
    });
    // Five cards, one package focus, two relation kinds and one grouping question.
    expect(first.usage.calls).toBe(9);
    // The focus halves the weight of a card outside the chosen package without hiding it.
    const model = first.scored.nodes.find((node) => node.label === 'Model');
    expect(model?.score).toBeCloseTo(0.9 * (Zoom.FOCUS_FLOOR + (1 - Zoom.FOCUS_FLOOR) * 0.5));

    const second = await EffectEx.runPromise(Zoom.zoom(options).pipe(Effect.provide(SystemOne.refusing)));
    expect(second.usage).toMatchObject({ calls: 0, cached: 9 });
    expect(second.scored.nodes.map((node) => node.score)).toEqual(first.scored.nodes.map((node) => node.score));
  });

  test('when every relation kind is judged irrelevant, imports still draw', async () => {
    const dismissive = SystemOne.scripted(({ state }): Record<string, DecisionModel.ProviderAnswer> => ({
      matters: { _tag: 'Probability', probability: JSON.stringify(state).includes('"relation"') ? 0.1 : 0.9 },
    }));
    const { scored } = await EffectEx.runPromise(
      Zoom.zoom({
        prompt: candidates.prompt,
        candidates,
        scorer: 'system-one',
        model: 'test',
        cache: Cache.memory(),
        threshold: 0.5,
        budget: 10,
      }).pipe(Effect.provide(dismissive)),
    );
    expect(scored.relations.imports).toBe(0.5);
    expect(Zoom.keptEdges(scored).some((edge) => edge.kind === 'imports')).toBe(true);
  });

  test('when the relevant kinds leave the kept nodes unconnected, the dependency kinds become the floor', async () => {
    const servicesOnly = SystemOne.scripted(({ state, decisions }): Record<string, DecisionModel.ProviderAnswer> => {
      const text = JSON.stringify(state);
      if (!('matters' in decisions)) {
        return {};
      }
      if (text.includes('"relation"')) {
        return { matters: { _tag: 'Probability', probability: text.includes('provides') ? 0.9 : 0.1 } };
      }
      return { matters: { _tag: 'Probability', probability: /"name":"(util|log)"/.test(text) ? 0.1 : 0.9 } };
    });
    const { scored } = await EffectEx.runPromise(
      Zoom.zoom({
        prompt: candidates.prompt,
        candidates,
        scorer: 'system-one',
        model: 'test',
        cache: Cache.memory(),
        threshold: 0.5,
        budget: 10,
      }).pipe(Effect.provide(servicesOnly)),
    );
    expect(scored.relations.providesService).toBe(0.9);
    expect(scored.relations.imports).toBe(0.5);
    expect(Zoom.keptEdges(scored)).toContainEqual(
      expect.objectContaining({ to: `${FILE}packages/model/src/Model.ts`, kind: Graph.RELAY }),
    );
  });

  test('a refused call falls back to the baseline instead of scoring zero', async () => {
    const result = await EffectEx.runPromise(
      Zoom.zoom({
        prompt: candidates.prompt,
        candidates,
        scorer: 'system-one',
        model: 'test',
        cache: Cache.memory(),
        threshold: 0,
        budget: 10,
      }).pipe(Effect.provide(SystemOne.refusing)),
    );
    const agent = result.scored.nodes.find((node) => node.label === 'AgentService');
    expect(agent?.score).toBeGreaterThan(0);
    expect(result.usage.calls).toBe(0);
  });
});

describe('Design.toGraphData', () => {
  test('hidden nodes travel without doc or snippet, and edges only join nodes that travel', async () => {
    const { scored } = await EffectEx.runPromise(
      Zoom.zoom({
        prompt: candidates.prompt,
        candidates: {
          ...candidates,
          nodes: candidates.nodes.map((node) => ({ ...node, doc: 'doc', snippet: 'const x = 1;' })),
        },
        scorer: 'system-one',
        model: 'test',
        cache: Cache.memory(),
        threshold: 0.5,
        budget: 10,
      }).pipe(Effect.provide(scripted)),
    );
    const data = Design.toGraphData(scored);
    const util = data.nodes.find((node) => node.label === 'util');
    expect(util?.kept).toBe(false);
    expect(util?.card).not.toHaveProperty('snippet');
    expect(data.nodes.find((node) => node.label === 'AgentService')?.card.snippet).toBe('const x = 1;');
    const ids = new Set(data.nodes.map((node) => node.id));
    expect(data.edges.every((edge) => ids.has(edge.from) && ids.has(edge.to))).toBe(true);
  });
});

describe('Compact', () => {
  test('builds grouped DSL with refs, labelling only the relations that say something', async () => {
    const { scored } = await EffectEx.runPromise(
      Zoom.zoom({
        prompt: candidates.prompt,
        candidates,
        scorer: 'system-one',
        model: 'test',
        cache: Cache.memory(),
        threshold: 0.5,
        budget: 10,
      }).pipe(Effect.provide(scripted)),
    );
    const diagram = Compact.build(scored, { name: 'test', grouping: 'package', nodes: 3, edges: 'all' });
    expect(diagram.groups).toEqual([{ id: 'g0', label: '@dxos/agent' }]);
    expect(diagram.dsl).toContain('edge AgentLayer -> AgentService "provides"');
    expect(diagram.dsl).toContain('edge AgentLayer -> Model\n');
    expect(diagram.dsl).toContain('node Model ref="packages/model/src/Model.ts"');
    expect(diagram.nodes).toHaveLength(3);
  });

  test('a threshold that keeps nothing still draws the best-scoring nodes', async () => {
    const { scored } = await EffectEx.runPromise(
      Zoom.zoom({
        prompt: candidates.prompt,
        candidates,
        scorer: 'system-one',
        model: 'test',
        cache: Cache.memory(),
        threshold: 0.99,
        budget: 10,
      }).pipe(Effect.provide(scripted)),
    );
    expect(scored.nodes.filter((node) => node.kept)).toHaveLength(0);
    const diagram = Compact.build(scored, { name: 'test', grouping: 'package', nodes: 14, edges: 'all' });
    expect(diagram.nodes.map((node) => node.label)).toContain('AgentService');
  });

  test('labels fit one line', () => {
    expect(Compact.shortLabel('AutomergeDocumentLoaderImpl').length).toBeLessThanOrEqual(Compact.MAX_LABEL);
    expect(Compact.shortLabel('DataSpaceManager')).toBe('DataSpaceManager');
  });
});

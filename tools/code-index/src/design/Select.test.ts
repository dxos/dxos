//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Ontology from '../Ontology.ts';
import type * as Graph from './Graph.ts';
import * as QueryExplorer from './QueryExplorer.ts';
import * as Select from './Select.ts';

const iri = (path: string) => Ontology.fileIri(path).value;

const card = (path: string, overrides: Partial<Graph.NodeCard> = {}): Graph.NodeCard => ({
  iri: iri(path),
  label: path,
  kind: 'function',
  path,
  symbols: ['thing'],
  inDegree: 0,
  outDegree: 0,
  why: '',
  hops: 0,
  provenance: ['query 1'],
  ...overrides,
});

const record = (index: number, files: string[], ok = true): QueryExplorer.QueryRecord => ({
  index,
  purpose: `q${index}`,
  sparql: '',
  ok,
  rows: files.length,
  ms: 1,
  files: files.map(iri),
});

describe('QueryExplorer', () => {
  test('rows name files by file IRI, symbol IRI or repo path', ({ expect }) => {
    expect(
      QueryExplorer.filesOf({
        file: iri('src/a.ts'),
        symbol: `${iri('src/b.ts')}#make`,
        path: 'src/c.tsx',
        name: 'Queue',
        pkg: `${Ontology.PACKAGE_BASE}@dxos/x`,
        types: 'src/x.d.ts',
      }),
    ).toEqual([iri('src/a.ts'), iri('src/b.ts'), iri('src/c.tsx')]);
  });

  test('the union keeps every successful query, most agreed on first, with its sources', ({ expect }) => {
    const found = QueryExplorer.union(
      [
        record(0, ['src/a.ts']),
        record(1, ['src/b.ts', 'src/a.ts']),
        record(2, ['src/z.ts'], false),
        record(3, ['src/c.ts', 'src/b.ts']),
      ],
      10,
    );
    expect([...found.keys()]).toEqual([iri('src/a.ts'), iri('src/b.ts'), iri('src/c.ts')]);
    expect(found.get(iri('src/b.ts'))?.sources).toEqual([1, 3]);
    expect(found.has(iri('src/z.ts'))).toBe(false);
    expect([...QueryExplorer.union([record(1, ['src/a.ts', 'src/b.ts', 'src/c.ts'])], 2).keys()]).toEqual([
      iri('src/a.ts'),
      iri('src/b.ts'),
    ]);
  });

  test('a bridge links at least two found files', ({ expect }) => {
    const members = new Set([iri('src/a.ts'), iri('src/b.ts')]);
    const edges: Graph.Edge[] = [
      { from: iri('src/a.ts'), to: iri('src/hub.ts'), kind: 'imports' },
      { from: iri('src/hub.ts'), to: iri('src/b.ts'), kind: 'imports' },
      { from: iri('src/a.ts'), to: iri('src/leaf.ts'), kind: 'imports' },
    ];
    expect([...QueryExplorer.bridges(members, edges, 5)]).toEqual([[iri('src/hub.ts'), 2]]);
  });

  test('a parse error from OR or LIKE carries the fix', ({ expect }) => {
    expect(QueryExplorer.hint("FILTER(CONTAINS(?n, 'a') OR CONTAINS(?n, 'b'))", 'expected NOT')).toContain('||');
    expect(QueryExplorer.hint("FILTER(CONTAINS(?n, 'a OR b'))", 'expected NOT')).toBe('expected NOT');
    expect(QueryExplorer.hint('FILTER(?n LIKE "%a%")', 'bad')).toContain('CONTAINS');
  });
});

describe('Select', () => {
  test('tests, stories, generated code, internals and file-local files are hidden unless asked for', ({ expect }) => {
    const prompt = 'how does the queue work?';
    expect(Select.hiddenBy(card('src/queue.test.ts'), prompt)).toBe('test');
    expect(Select.hiddenBy(card('src/testing/fake.ts'), prompt)).toBe('test');
    expect(Select.hiddenBy(card('src/Queue.stories.tsx'), prompt)).toBe('story');
    expect(Select.hiddenBy(card('src/proto/gen/schema.ts'), prompt)).toBe('generated');
    expect(Select.hiddenBy(card('src/internal/heap.ts'), prompt)).toBe('internal');
    expect(Select.hiddenBy(card('src/script.ts', { symbols: [] }), prompt)).toBe('file-local');
    expect(Select.hiddenBy(card('src/queue.ts'), prompt)).toBeUndefined();

    expect(Select.hiddenBy(card('src/queue.test.ts'), 'how is the queue tested?')).toBeUndefined();
    expect(Select.hiddenBy(card('src/Queue.stories.tsx'), 'which stories show the queue?')).toBeUndefined();
    expect(Select.hiddenBy(card('src/internal/heap.ts'), 'what are the queue internals?')).toBeUndefined();
    // Asking for tests does not bring back stories.
    expect(Select.hiddenBy(card('src/Queue.stories.tsx'), 'how is the queue tested?')).toBe('story');
  });

  test('connectivity scales relevance and never rescues an irrelevant hub', ({ expect }) => {
    const cards = [
      card('src/core.ts', { inDegree: 4, outDegree: 2, provenance: ['query 1', 'query 2'] }),
      card('src/leaf.ts'),
      card('src/hub.ts', { inDegree: 40, outDegree: 40 }),
      card('src/core.test.ts', { inDegree: 4 }),
    ];
    const indexDegree = new Map([
      [iri('src/core.ts'), 20],
      [iri('src/hub.ts'), 500],
    ]);
    const scores = Select.score(cards, [0.9, 0.9, 0.1, 0.9], { prompt: 'the core', indexDegree });
    expect(scores[0]).toBeGreaterThan(scores[1]);
    expect(scores[1]).toBeCloseTo(
      0.9 * Select.BOOST_FLOOR + 0.9 * (1 - Select.BOOST_FLOOR) * Select.WEIGHTS.provenance * 0.5,
    );
    expect(scores[2]).toBeLessThanOrEqual(0.1);
    expect(scores[3]).toBe(0);
  });

  test('the kept set grows from the best file through its neighbours', ({ expect }) => {
    const nodes = [
      { iri: 'a', score: 0.9 },
      { iri: 'b', score: 0.5 },
      { iri: 'c', score: 0.8 },
      { iri: 'far', score: 0.55 },
      { iri: 'island', score: 0.75 },
      { iri: 'stray', score: 0.7 },
      { iri: 'weak', score: 0.2 },
    ];
    const edges: Graph.Edge[] = [
      { from: 'a', to: 'b', kind: 'imports' },
      { from: 'b', to: 'x', kind: 'imports' },
      { from: 'x', to: 'far', kind: 'imports' },
      { from: 'c', to: 'weak', kind: 'imports' },
    ];
    // `c` outscores `b` and `far`, but they are reachable from `a` and `c` is not, so they join first.
    expect([...Select.keep(nodes, edges, { threshold: 0.3, budget: 3 })]).toEqual(['a', 'b', 'far']);
    // Five pass the relative bars, fewer than MIN_KEPT, so the set is regrown over the threshold alone
    // and `stray` (under the island share, over the relative floor) joins as an island.
    expect([...Select.keep(nodes, edges, { threshold: 0.3, budget: 10 })]).toEqual([
      'a',
      'b',
      'far',
      'c',
      'island',
      'stray',
    ]);
    expect(Select.keep([], edges, { threshold: 0.3, budget: 10 }).size).toBe(0);
    // With enough strong files, a connected one over the threshold still needs half the best score.
    const strong = ['a', 'b', 'c', 'd', 'e', 'f'];
    const relative = Select.keep(
      [...strong.map((name) => ({ iri: name, score: 1 })), { iri: 'weak', score: 0.45 }],
      strong.map((name) => ({ from: name, to: 'weak', kind: 'imports' })),
      { threshold: 0.3, budget: 10 },
    );
    expect([...relative]).toEqual(strong);
  });
});

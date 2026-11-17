//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Dsl } from '@dxos/diagram';
import { type RDF } from '@dxos/pipeline-rdf';

import { modelName, pipelineScene, totals } from './pipeline-diagram.ts';

const usage = (model: string, calls: number, costUsd?: number): RDF.Pipeline.ModelUsage => ({
  model,
  calls,
  inputTokens: calls * 1_000,
  outputTokens: calls * 100,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  ...(costUsd !== undefined ? { costUsd } : {}),
});

const STATE: RDF.Pipeline.State = {
  name: 'cloudflare-60d',
  status: 'done',
  startedAt: '2026-11-16T15:30:00.000Z',
  endedAt: '2026-11-16T15:46:00.000Z',
  sources: [
    {
      id: 'a',
      label: 'D1 migrations stuck',
      items: 40,
      firstItemAt: '2026-09-17T15:36:50.000Z',
      lastItemAt: '2026-10-01T10:00:00.000Z',
    },
    {
      id: 'b',
      items: 2,
      firstItemAt: '2026-10-02T00:00:00.000Z',
      lastItemAt: '2026-11-16T15:08:41.000Z',
      cursor: '123',
    },
    { id: 'c', items: 0 },
  ],
  stages: [
    { id: 'extract-facts', label: 'Extract facts', order: 2, models: [usage('claude-haiku-5-5', 149, 4.2)] },
    { id: 'crawl', label: 'Crawl', order: 0, items: 42, models: [] },
    { id: 'topics', label: 'Topics', order: 1, models: [usage('claude-haiku-5-5', 2_254, 1.5)] },
  ],
  facts: 6_746,
};

describe('pipelineScene', () => {
  test('names a model as a reader does', ({ expect }) => {
    expect(modelName('claude-haiku-5-5')).toBe('Haiku 5.5');
    expect(modelName('claude-opus-5')).toBe('Opus 5');
    expect(modelName('@cf/clairic')).toBe('@cf/clairic');
  });

  test('totals the sources that were read and every model call', ({ expect }) => {
    expect(totals(STATE)).toEqual({
      sources: 2,
      items: 42,
      first: '2026-09-17T15:36:50.000Z',
      last: '2026-11-16T15:08:41.000Z',
      calls: 2_403,
      tokens: 2_403 * 1_100,
      costUsd: 5.7,
    });
  });

  test('draws stages in order, one shared model card, and the facts written', ({ expect }) => {
    const source = pipelineScene(STATE);
    expect(source).toContain('name="Pipeline · 16 min"');
    expect(source.indexOf('"Crawl"')).toBeLessThan(source.indexOf('"Topics"'));
    expect(source.indexOf('"Topics"')).toBeLessThan(source.indexOf('"Extract facts"'));
    expect(source.match(/"Haiku 5.5"/g)).toHaveLength(1);
    expect(source).toContain('"6,746 facts"');
    expect(source).toContain('"first Sep 17, 15:36"');
    expect(source).toContain('"2,254 calls · $1.50"');
  });

  test('reads back as one 2D scene with every card and link', ({ expect }) => {
    const { document, problems } = Dsl.readScenes(pipelineScene(STATE));
    expect(problems).toEqual([]);
    expect(document.scenes).toHaveLength(1);
    // Source, first, last, three stages, memory and one model; three stage links, the output and two model links.
    expect(Object.keys(document.layouts[0]?.elements ?? {})).toHaveLength(14);
  });
});

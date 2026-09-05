//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { analyze, errors } from './diagnostics';
import type * as Scene from './scene';
import { CLASS_DIAGRAM } from './testing';
import * as UmlEngine from './uml-engine';
import * as UmlGrid from './uml-grid';
import * as UmlRules from './uml-rules';
import * as UmlSearch from './uml-search';

const objectsOf = (commands: readonly Scene.Command[]) =>
  commands.flatMap((command) => (command.op === 'upsert-object' ? [command.object] : []));

const box = (id: string, x: number, y: number, w = 64, h = 64, text?: string): Scene.WorldObject => ({
  id,
  origin: { x, y },
  elements: [{ kind: 'rect', id: 'frame', x: 0, y: 0, w, h, text }],
});

const arrow = (id: string, start: Scene.Point, end: Scene.Point): Scene.Element => ({ kind: 'arrow', id, start, end });

describe('diagnostics', () => {
  test('a clean scene reports nothing', ({ expect }) => {
    const report = analyze([
      box('a', 0, 0),
      box('b', 0, 200),
      { id: 'edges', elements: [arrow('a-b', { x: 32, y: 64 }, { x: 32, y: 200 })] },
    ]);

    expect(report.diagnostics).toEqual([]);
    expect(report.metrics).toMatchObject({ nodes: 2, connectors: 1, crossings: 0, bends: 0 });
  });

  test('detects partially overlapping nodes, but not containment', ({ expect }) => {
    const overlapping = analyze([box('a', 0, 0), box('b', 32, 32)]);
    expect(overlapping.diagnostics.map(({ code }) => code)).toEqual(['node-overlap']);

    // A subgraph frame enclosing its members is a container, not a collision.
    const contained = analyze([box('frame', 0, 0, 400, 400), box('a', 32, 32)]);
    expect(contained.diagnostics).toEqual([]);
  });

  test('detects a connector drawn across a node it does not terminate at', ({ expect }) => {
    const report = analyze([
      box('a', 0, 0),
      box('blocker', 0, 128),
      box('b', 0, 320),
      { id: 'edges', elements: [arrow('a-b', { x: 32, y: 64 }, { x: 32, y: 320 })] },
    ]);

    expect(report.diagnostics.map(({ code }) => code)).toEqual(['route-through-node']);
    expect(report.diagnostics[0].refs).toEqual(['edges/a-b', 'blocker/frame']);
  });

  test('a connector ending on a border is not a crossing', ({ expect }) => {
    const report = analyze([
      box('a', 0, 0),
      box('b', 0, 200),
      { id: 'edges', elements: [arrow('a-b', { x: 32, y: 64 }, { x: 32, y: 200 })] },
    ]);

    expect(report.metrics.routesThroughNodes).toBe(0);
  });

  test('detects a label that cannot fit its shape', ({ expect }) => {
    const report = analyze([box('a', 0, 0, 64, 32, 'A very long label that will never fit')]);

    expect(report.diagnostics.map(({ code }) => code)).toEqual(['label-overflow']);
  });

  test('counts proper crossings between distinct connectors, ignoring shared ports', ({ expect }) => {
    const crossing = analyze([
      {
        id: 'edges',
        elements: [arrow('h', { x: 0, y: 50 }, { x: 100, y: 50 }), arrow('v', { x: 50, y: 0 }, { x: 50, y: 100 })],
      },
    ]);
    expect(crossing.metrics.crossings).toBe(1);
    expect(crossing.diagnostics[0].severity).toBe('warning');

    const fanIn = analyze([
      {
        id: 'edges',
        elements: [arrow('a', { x: 0, y: 0 }, { x: 50, y: 50 }), arrow('b', { x: 100, y: 0 }, { x: 50, y: 50 })],
      },
    ]);
    expect(fanIn.metrics.crossings).toBe(0);
  });

  test('rejoins a routed path with its arrow head and counts its bends', ({ expect }) => {
    const report = analyze([
      {
        id: 'edges',
        elements: [
          {
            kind: 'line',
            id: 'a-b-path',
            points: [
              { x: 0, y: 0 },
              { x: 0, y: 50 },
              { x: 100, y: 50 },
            ],
          },
          arrow('a-b', { x: 100, y: 50 }, { x: 100, y: 100 }),
        ],
      },
    ]);

    expect(report.metrics.connectors).toBe(1);
    expect(report.metrics.bends).toBe(2);
    expect(analyze(objectsOf([]), { maxBends: 1 }).diagnostics).toEqual([]);
    expect(
      analyze(
        [
          {
            id: 'edges',
            elements: [
              {
                kind: 'line',
                id: 'z-path',
                points: [
                  { x: 0, y: 0 },
                  { x: 0, y: 10 },
                  { x: 10, y: 10 },
                  { x: 10, y: 20 },
                ],
              },
              arrow('z', { x: 10, y: 20 }, { x: 20, y: 20 }),
            ],
          },
        ],
        { maxBends: 2 },
      ).diagnostics.map(({ code }) => code),
    ).toEqual(['excessive-bends']);
  });
});

//
// Tier 1: every placement strategy must produce a scene free of hard defects for the shared
// fixture. Soft metrics are recorded in the snapshot so a layout change reads as a diff.
//

const strategies: Record<string, (source: string) => Promise<readonly Scene.Command[]>> = {
  grid: async (source) => UmlGrid.compile(source),
  dagre: (source) => UmlEngine.compile(source, { engine: 'dagre' }),
  elk: (source) => UmlEngine.compile(source, { engine: 'elk' }),
  rules: async (source) => UmlRules.compile(source),
  search: async (source) => UmlSearch.compile(source),
};

describe.each(Object.entries(strategies))('layout quality (%s)', (_name, compile) => {
  test('the class-diagram fixture has no hard defects', async ({ expect }) => {
    const report = analyze(objectsOf(await compile(CLASS_DIAGRAM)));

    expect(errors(report).map(({ message }) => message)).toEqual([]);
    expect(report.metrics.nodes).toBeGreaterThan(0);
    expect(report.metrics.connectors).toBe(5);
  });

  test('soft metrics', async ({ expect }) => {
    const { crossings, bends } = analyze(objectsOf(await compile(CLASS_DIAGRAM))).metrics;

    expect({ crossings, bends }).toMatchSnapshot();
  });
});

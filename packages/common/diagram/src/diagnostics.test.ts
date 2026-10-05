//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { analyze, arrowPoints, bindTargets, errors, layoutLabel, routes } from './diagnostics.ts';
import type * as Scene from './scene.ts';
import { CLASS_DIAGRAM } from './testing.ts';
import * as UmlEngine from './uml-engine.ts';
import * as UmlGrid from './uml-grid.ts';
import * as UmlRules from './uml-rules.ts';
import * as UmlSearch from './uml-search.ts';

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

    // Exactly stacked nodes are the strongest overlap, not a container and its member.
    const stacked = analyze([box('a', 0, 0), box('b', 0, 0)]);
    expect(stacked.diagnostics.map(({ code }) => code)).toEqual(['node-overlap']);

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

  test('detects labels overlapping each other or a box, not a frame', ({ expect }) => {
    const label = (id: string, x: number, y: number, text: string): Scene.Element => ({ kind: 'text', id, x, y, text });
    const report = analyze([
      box('a', 0, 0),
      box('frame', -32, -32, 400, 400),
      { id: 'edges', elements: [label('one', 100, 100, 'spawn child'), label('two', 110, 110, 'per process')] },
      { id: 'more', elements: [label('three', 10, 10, 'on a box'), label('clear', 300, 300, 'x')] },
    ]);
    expect(report.metrics.textOverlaps).toBe(2);
    expect(report.diagnostics.filter(({ code }) => code === 'text-overlap').map(({ refs }) => refs)).toEqual([
      ['edges/one', 'edges/two'],
      ['more/three', 'a/frame'],
    ]);
  });

  test('detects connectors running along the same line, not ones that only cross or share a port', ({ expect }) => {
    const report = analyze([
      {
        id: 'edges',
        elements: [
          arrow('trunk', { x: 0, y: 0 }, { x: 200, y: 0 }),
          arrow('shares', { x: 100, y: 0 }, { x: 300, y: 0 }),
          arrow('crosses', { x: 50, y: -50 }, { x: 50, y: 50 }),
          arrow('port', { x: 0, y: 0 }, { x: 0, y: 100 }),
        ],
      },
    ]);
    expect(report.metrics.edgeOverlaps).toBe(1);
    expect(report.diagnostics.find(({ code }) => code === 'edge-overlap')?.refs).toEqual([
      'edges/trunk',
      'edges/shares',
    ]);
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

describe('connector geometry', () => {
  const line = (id: string, points: Scene.Point[]): Scene.Element => ({ kind: 'line', id, points });

  test('a bound arrow is measured along the clipped segment the renderer draws', ({ expect }) => {
    const bound: Scene.WorldObject = {
      id: 'edges',
      elements: [{ kind: 'arrow', id: 'a-b', from: 'a/frame', to: 'b/frame' }],
    };
    const report = analyze([box('a', 0, 0), box('blocker', 0, 128), box('b', 0, 320), bound]);
    expect(report.metrics.connectors).toBe(1);
    expect(report.metrics.length).toBe(256);
    expect(report.diagnostics.map(({ code }) => code)).toEqual(['route-through-node']);

    const objects = [box('a', 0, 0), box('b', 200, 200), bound];
    expect(
      arrowPoints(bound, { kind: 'arrow', id: 'a-b', from: 'a/frame', to: 'b/frame' }, bindTargets(objects)),
    ).toEqual([
      { x: 64, y: 64 },
      { x: 200, y: 200 },
    ]);
  });

  test('a T where one connector ends on another at a port is not a crossing', ({ expect }) => {
    const report = analyze([
      box('port', 40, 50, 20, 20),
      {
        id: 'edges',
        elements: [
          arrow('along', { x: 0, y: 50 }, { x: 100, y: 50 }),
          arrow('into', { x: 50, y: 100 }, { x: 50, y: 50 }),
        ],
      },
    ]);
    expect(report.metrics.crossings).toBe(0);
  });

  test('a bus trunk and its spokes are one connector, traced once per spoke', ({ expect }) => {
    const objects: Scene.WorldObject[] = [
      box('hub', 68, 0),
      box('left', -12, 200),
      box('middle', 28, 200),
      box('other', 300, 100),
      {
        id: 'edges',
        elements: [
          line('hub-bus-0-trunk', [
            { x: 100, y: 64 },
            { x: 100, y: 120 },
          ]),
          // Both spokes leave the junction along one run before they part.
          line('hub-left-path', [
            { x: 100, y: 120 },
            { x: 60, y: 120 },
            { x: 20, y: 120 },
          ]),
          arrow('hub-left', { x: 20, y: 120 }, { x: 20, y: 200 }),
          line('hub-middle-path', [
            { x: 100, y: 120 },
            { x: 60, y: 120 },
          ]),
          arrow('hub-middle', { x: 60, y: 120 }, { x: 60, y: 200 }),
          // One unrelated connector crosses the trunk and both spokes' shared run.
          line('stray-path', [
            { x: 332, y: 100 },
            { x: 332, y: 90 },
            { x: 80, y: 90 },
          ]),
          arrow('stray', { x: 80, y: 90 }, { x: 80, y: 150 }),
        ],
      },
    ];
    const report = analyze(objects, { maxBends: 1 });
    expect(report.metrics).toMatchObject({ connectors: 3, crossings: 1, edgeOverlaps: 0 });
    // A spoke is traced from the hub; the turn at the junction is the bus's shape, its own corner a bend.
    expect(report.diagnostics.filter(({ code }) => code === 'excessive-bends').map(({ refs }) => refs)).toEqual([
      ['edges/stray'],
    ]);
    expect(routes(objects).find(({ ref }) => ref === 'edges/hub-left')).toMatchObject({ bends: 1 });
    expect(routes(objects).find(({ ref }) => ref === 'edges/hub-left')?.points).toEqual([
      { x: 100, y: 64 },
      { x: 100, y: 120 },
      { x: 20, y: 120 },
      { x: 20, y: 200 },
    ]);
  });

  test('stubs meeting an inheritance bus mid-line do not cross it', ({ expect }) => {
    const report = analyze([
      box('base', 68, 0),
      box('first', 0, 200),
      box('second', 68, 200),
      box('third', 136, 200),
      {
        id: 'edges',
        elements: [
          line('base-bus', [
            { x: 32, y: 132 },
            { x: 168, y: 132 },
          ]),
          ...[32, 100, 168].map((x, index) =>
            line(`sub-${index}-base-stub-${index}`, [
              { x, y: 200 },
              { x, y: 132 },
            ]),
          ),
          {
            kind: 'arrow',
            id: 'base-inherit',
            start: { x: 100, y: 132 },
            end: { x: 100, y: 64 },
            relation: 'inheritance',
          },
        ],
      },
    ]);
    expect(report.metrics).toMatchObject({ connectors: 3, crossings: 0, edgeOverlaps: 0 });
  });

  test('a self-loop is drawn off its box and measures without NaN or a crossing', ({ expect }) => {
    const objects: Scene.WorldObject[] = [
      box('a', 0, 0),
      box('b', 0, 200),
      {
        id: 'edges',
        elements: [
          { kind: 'arrow', id: 'a-a', from: 'a/frame', to: 'a/frame' },
          { kind: 'arrow', id: 'a-b', from: 'a/frame', to: 'b/frame' },
        ],
      },
    ];
    const { metrics, diagnostics } = analyze(objects);
    expect(Object.values(metrics).every((value) => !Number.isNaN(value))).toBe(true);
    expect(metrics).toMatchObject({ connectors: 2, crossings: 0, routesThroughNodes: 0, bends: 3 });
    expect(diagnostics).toEqual([]);
  });
});

describe('box labels', () => {
  test('a long label wraps at camel case, and one too long to fit is ellipsized at a smaller size', ({ expect }) => {
    const wrapped = layoutLabel('RemoteProcessHandleWithLongName', 'm', { w: 192, h: 160 });
    expect(wrapped).toMatchObject({ lines: ['RemoteProcess', 'HandleWithLong', 'Name'], size: 18, overflow: false });

    const squeezed = layoutLabel('RemoteProcessHandleWithLongName', 'm', { w: 192, h: 64 });
    expect(squeezed.size).toBeLessThan(18);
    expect(squeezed.overflow).toBe(false);
    expect(squeezed.lines.join('')).toBe('RemoteProcessHandleWithLongName');

    const truncated = layoutLabel('RemoteProcessHandleWithLongName and then some more words', 'm', { w: 192, h: 40 });
    expect(truncated.overflow).toBe(true);
    expect(truncated.lines).toHaveLength(1);
    expect(truncated.lines[0].endsWith('…')).toBe(true);
  });

  test('label-overflow reports what the renderer cannot show, not text it wraps', ({ expect }) => {
    const report = analyze([box('a', 0, 0, 192, 160, 'RemoteProcessHandleWithLongName')]);
    expect(report.metrics.labelOverflows).toBe(0);
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

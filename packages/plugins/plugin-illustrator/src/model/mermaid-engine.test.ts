//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { trim } from '@dxos/util';

import { analyze, errors } from './diagnostics';
import { toStandard } from './mermaid';
import { compile, layout } from './mermaid-engine';
import type * as Scene from './scene';
import { BASIC } from './testing';
import { GRID } from './uml-grid';

const objectsOf = (commands: readonly Scene.Command[]) =>
  commands.flatMap((command) => (command.op === 'upsert-object' ? [command.object] : []));

/** Two subgraphs, cross-group edges, a fan-in, and a back edge. */
const FLOWCHART = trim`
  flowchart TB
    subgraph client [Client]
      App[Composer]
      Framework[App Framework]
    end
    subgraph core [Core]
      Echo[ECHO]
      Halo[HALO]
      Mesh[MESH]
    end
    Edge[EDGE]
    App --> Framework
    Framework --> Echo
    Framework --> Halo
    Echo --> Mesh
    Halo --> Mesh
    Mesh -->|sync| Edge
    Edge --> Echo
    %% ref Echo packages/core/echo
    %% ref Edge https://github.com/dxos/edge
`;

/** Runs a sweep once for the file: a candidate sweep is seconds of ELK and routing, and the tests only read its result. */
const once = <T>(compute: () => Promise<T>) => {
  let promise: Promise<T> | undefined;
  return () => (promise ??= compute());
};
const basicLayout = once(() => layout(BASIC));
const flowchartObjects = once(async () => objectsOf(await compile(FLOWCHART)));

// The shared sweeps land on whichever test awaits them first, on a CI runner several times slower than a laptop.
describe('mermaid-engine', { timeout: 120_000 }, () => {
  test('ref directives land on the world objects they name', async ({ expect }) => {
    const objects = await flowchartObjects();

    expect(objects.find(({ id }) => id === 'Echo')?.ref).toBe('packages/core/echo');
    expect(objects.find(({ id }) => id === 'Edge')?.ref).toBe('https://github.com/dxos/edge');
    expect(objects.find(({ id }) => id === 'Mesh')?.ref).toBeUndefined();
  });

  test('places nodes on the grid and frames enclose their members', async ({ expect }) => {
    const objects = await flowchartObjects();
    const nodes = objects.filter((object) => !['edges', 'client', 'core'].includes(object.id));

    expect(nodes).toHaveLength(6);
    for (const node of nodes) {
      expect(node.origin!.x % GRID).toBe(0);
      expect(node.origin!.y % GRID).toBe(0);
    }

    const frame = (id: string) => {
      const object = objects.find((entry) => entry.id === id)!;
      const rect = object.elements.find((element) => element.id === 'frame') as Scene.Box;
      return { x: object.origin!.x, y: object.origin!.y, w: rect.w, h: rect.h };
    };
    const inside = (nodeId: string, frameId: string) => {
      const node = objects.find((entry) => entry.id === nodeId)!;
      const box = node.elements[0] as Scene.Box;
      const outer = frame(frameId);
      return (
        node.origin!.x >= outer.x &&
        node.origin!.y >= outer.y &&
        node.origin!.x + box.w <= outer.x + outer.w &&
        node.origin!.y + box.h <= outer.y + outer.h
      );
    };
    expect(inside('App', 'client')).toBe(true);
    expect(inside('Framework', 'client')).toBe(true);
    expect(inside('Echo', 'core')).toBe(true);
    expect(inside('Mesh', 'core')).toBe(true);
    expect(inside('Edge', 'core')).toBe(false);
  });

  test('layout ranks every candidate and the chosen one has the lowest feasible cost', async ({ expect }) => {
    const result = await basicLayout();

    // lattice × order × arrangement × layering × alignment × bus, less the knob settings that reach
    // a placement already routed (three groups, so both arrangements are tried).
    expect(result.ranked.length).toBeGreaterThanOrEqual(16);
    const feasible = result.ranked.filter(({ evaluation }) => evaluation.violations.length === 0);
    expect(feasible.length).toBeGreaterThan(0);
    expect(result.chosen).toBe(result.ranked[0]);
    expect(result.chosen.evaluation.cost).toBe(Math.min(...feasible.map(({ evaluation }) => evaluation.cost)));
    expect(result.chosen.candidate.bus).toBe(true);
  });

  test('a labelled inheritance edge keeps its own connector and label beside the bus', async ({ expect }) => {
    const objects = objectsOf(
      await compile(trim`
        flowchart TB
          B --|> A
          C --|> A
          D --|>|via mixin| A
      `),
    );
    const edges = objects.find(({ id }) => id === 'edges')!.elements;

    expect(edges.find(({ id }) => id === 'A-bus')?.kind).toBe('line');
    expect(edges.filter(({ id }) => /-stub-\d$/.test(id))).toHaveLength(2);
    const labelled = edges.filter((element) => element.kind === 'text' && element.text === 'via mixin');
    expect(labelled).toHaveLength(1);
    expect(edges.filter((element) => element.kind === 'arrow' && element.head === 'triangle')).toHaveLength(2);
  });

  test('toStandard rewrites the UML tokens into mermaid-legal labelled arrows', ({ expect }) => {
    expect(toStandard(BASIC)).not.toMatch(/--\|>|--\{|o-->/);
    expect(toStandard('  B --|> A')).toBe('  B -->|extends| A');
    expect(toStandard('X --{ Y')).toBe('X -->|has many| Y');
    expect(toStandard('P o--> Q')).toBe('P -->|contains| Q');
    // A label of the edge's own survives in place of the kind's.
    expect(toStandard('B --|>|is a| A')).toBe('B -->|is a| A');
    expect(toStandard('X --{ |owns| Y')).toBe('X -->|owns| Y');
    expect(toStandard('P o--> |holds| Q')).toBe('P -->|holds| Q');
    // Plain arrows and labelled edges pass through untouched.
    expect(toStandard('Y -->|sync| Z')).toBe('Y -->|sync| Z');
  });

  // In columns the root level is laid across the flow, so an edge between two ungrouped nodes runs
  // across it: a straight connector, with no polyline, on the across axis.
  for (const [direction, axis] of [
    ['TB', 'y'],
    ['LR', 'x'],
  ] as const) {
    test(`columns: an edge between ungrouped nodes runs across the ${direction} flow`, async ({ expect }) => {
      const { chosen } = await layout(
        trim`
          flowchart ${direction}
            subgraph g1 [G1]
              A
            end
            subgraph g2 [G2]
              B
            end
            M --> N
            A --> B
        `,
        { arrangement: ['columns'] },
      );
      const edges = chosen.candidate.layout.objects.find(({ id }) => id === 'edges')!.elements;
      const arrow = edges.find((element) => element.kind === 'arrow' && /^M-N-\d+$/.test(element.id));
      const terminals = arrow?.kind === 'arrow' ? [arrow.start?.[axis], arrow.end?.[axis]] : [];

      expect(edges.some(({ id }) => /^M-N-\d+-path$/.test(id))).toBe(false);
      expect(terminals[0]).toBeDefined();
      expect(terminals[0]).toBe(terminals[1]);
    });
  }

  test('edge tokens carry the UML end markers', async ({ expect }) => {
    const objects = objectsOf(
      await compile(trim`
        flowchart TB
          B --|> A
          X --{ Y
          P o--> Q
          R --> S
      `),
    );
    const arrows = objects
      .find(({ id }) => id === 'edges')!
      .elements.flatMap((element) => (element.kind === 'arrow' ? [element] : []));
    const byId = (prefix: string) => arrows.find(({ id }) => id.startsWith(prefix))!;

    expect(byId('B-A')).toMatchObject({ head: 'triangle' });
    expect(byId('X-Y')).toMatchObject({ head: 'crowsfoot' });
    expect(byId('P-Q')).toMatchObject({ tail: 'circle' });
    expect(byId('R-S').head).toBeUndefined();
  });

  test('basic: no hard defects, every connector straight or one bend', async ({ expect }) => {
    const objects = objectsOf((await basicLayout()).commands);
    const report = analyze(objects);

    expect(errors(report).map(({ message }) => message)).toEqual([]);
    expect(report.metrics.crossings).toBe(0);
    // Which arrangement wins is a close call on this fixture (columns by connector length); the
    // snapshot records it so a weight change shows up as a diff rather than a surprise.
    const { chosen } = await basicLayout();
    expect({
      arrangement: chosen.candidate.arrangement,
      cost: Number(chosen.evaluation.cost.toFixed(2)),
    }).toMatchSnapshot();
    // The inheritance bus wins: B and C stub up to one bus and a single triangle-headed trunk.
    const edges = objects.find(({ id }) => id === 'edges')!.elements;
    expect(edges.find(({ id }) => id === 'A-bus')?.kind).toBe('line');
    expect(edges.filter(({ id }) => id.endsWith('-stub-0') || id.endsWith('-stub-1'))).toHaveLength(2);
    expect(edges.filter((element) => element.kind === 'arrow' && element.head === 'triangle')).toHaveLength(1);
    // Nothing else needs a second bend, and the three frames sit at equal gaps.
    expect(report.metrics.frameGapSpread).toBe(0);

    // Inheritance reads upward: the base type sits above its subtypes.
    const originY = (id: string) => objects.find((object) => object.id === id)!.origin!.y;
    expect(originY('A')).toBeLessThan(originY('B'));
    expect(originY('A')).toBeLessThan(originY('C'));
    // Ownership reads downward: the owner above what it has many of.
    expect(originY('X')).toBeLessThan(originY('Y'));
    expect({ crossings: report.metrics.crossings, bends: report.metrics.bends }).toMatchSnapshot();

    // Packages read as separate: every pair of frames is at least a grid unit apart on some axis.
    const frames = objects
      .filter((object) => object.id.startsWith('pkg'))
      .map((object) => {
        const rect = object.elements.find((element) => element.id === 'frame') as Scene.Box;
        return { id: object.id, x: object.origin!.x, y: object.origin!.y, w: rect.w, h: rect.h };
      });
    expect(frames).toHaveLength(3);
    for (let i = 0; i < frames.length; i++) {
      for (let j = i + 1; j < frames.length; j++) {
        const [a, b] = [frames[i], frames[j]];
        const gapX = Math.max(a.x - (b.x + b.w), b.x - (a.x + a.w));
        const gapY = Math.max(a.y - (b.y + b.h), b.y - (a.y + a.h));
        expect(Math.max(gapX, gapY), `${a.id} vs ${b.id}`).toBeGreaterThanOrEqual(GRID);
      }
    }
  });

  test('has no hard defects and records its soft metrics', async ({ expect }) => {
    const report = analyze(await flowchartObjects());

    expect(errors(report).map(({ message }) => message)).toEqual([]);
    expect(report.metrics.connectors).toBe(7);
    expect({ crossings: report.metrics.crossings, bends: report.metrics.bends }).toMatchSnapshot();
  });
});

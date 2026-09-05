//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { trim } from '@dxos/util';

import { analyze, errors } from './diagnostics';
import { compile } from './mermaid-engine';
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

describe('mermaid-engine', () => {
  test('ref directives land on the world objects they name', async ({ expect }) => {
    const objects = objectsOf(await compile(FLOWCHART));

    expect(objects.find(({ id }) => id === 'Echo')?.ref).toBe('packages/core/echo');
    expect(objects.find(({ id }) => id === 'Edge')?.ref).toBe('https://github.com/dxos/edge');
    expect(objects.find(({ id }) => id === 'Mesh')?.ref).toBeUndefined();
  });

  test('places nodes on the grid and frames enclose their members', async ({ expect }) => {
    const objects = objectsOf(await compile(FLOWCHART));
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
    const objects = objectsOf(await compile(BASIC));
    const report = analyze(objects);

    expect(errors(report).map(({ message }) => message)).toEqual([]);
    expect(report.metrics.connectors).toBe(6);
    // Each package's relations fit in two lattice rows, so nothing should need a second bend.
    expect(report.metrics.crossings).toBe(0);

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
    const report = analyze(objectsOf(await compile(FLOWCHART)));

    expect(errors(report).map(({ message }) => message)).toEqual([]);
    expect(report.metrics.connectors).toBe(7);
    expect({ crossings: report.metrics.crossings, bends: report.metrics.bends }).toMatchSnapshot();
  });
});

//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { trim } from '@dxos/util';

import { analyze, errors } from './diagnostics';
import { compile } from './mermaid-engine';
import type * as Scene from './scene';
import { THREE_PACKAGES } from './testing';
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

  test('three packages: no hard defects, every connector straight or one bend', async ({ expect }) => {
    const objects = objectsOf(await compile(THREE_PACKAGES));
    const report = analyze(objects);

    expect(errors(report).map(({ message }) => message)).toEqual([]);
    expect(report.metrics.connectors).toBe(6);
    // Each package's relations fit in two lattice rows, so nothing should need a second bend.
    expect(report.metrics.crossings).toBe(0);
    expect({ crossings: report.metrics.crossings, bends: report.metrics.bends }).toMatchSnapshot();
  });

  test('has no hard defects and records its soft metrics', async ({ expect }) => {
    const report = analyze(objectsOf(await compile(FLOWCHART)));

    expect(errors(report).map(({ message }) => message)).toEqual([]);
    expect(report.metrics.connectors).toBe(7);
    expect({ crossings: report.metrics.crossings, bends: report.metrics.bends }).toMatchSnapshot();
  });
});

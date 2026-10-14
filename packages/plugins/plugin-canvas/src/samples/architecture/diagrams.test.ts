//
// Copyright 2026 DXOS.org
//

import * as Registry from 'effect/reactivity/AtomRegistry';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import { DEFAULT_LATTICE, isFrameNode, nodeBounds, onLattice, quantize } from '@dxos/react-ui-canvas/scene';

import { bindCanvasStore, elementId, isNodeRecord, nodeKey, parseLinkedSceneId } from '#model';

import { DIAGRAM_COMMANDS as files } from './compiled.ts';
import { loadDiagramDrawings, loadDiagramSet } from './diagrams.ts';
import { architectureDiagrams, composerDiagrams, diagramFiles, edgeDiagrams } from './sets.ts';

let builder: EchoTestBuilder;

beforeEach(async () => {
  builder = await new EchoTestBuilder().open();
});

afterEach(async () => {
  await builder.close();
});

describe('loadDiagramSet', () => {
  test.each([
    ['composer', composerDiagrams],
    ['edge', edgeDiagrams],
  ])('every drill-down box of the %s overview opens its diagram', async (prefix, makeSet) => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([Drawing.Drawing, Drawing.Canvas]);
    const set = makeSet(diagramFiles(files, prefix));
    const root = await loadDiagramSet(db, set);
    await db.flush();

    const canvas = root.canvas.target;
    if (!canvas) {
      throw new Error('The root drawing has no canvas.');
    }
    const registry = Registry.make();
    const bound = bindCanvasStore(registry, canvas);
    const drills = Object.keys(set.drills[set.root]).map((box) => elementId(box, 'box'));
    const linked = () =>
      drills.filter((id) => {
        const node = registry.get(bound.store.scenes)[bound.root].nodes[id];
        return isFrameNode(node) && parseLinkedSceneId(node.scene) !== undefined;
      });
    await expect.poll(linked).toEqual(drills);

    // The layout lands every box on a lattice cell, so links route along the gutters; group frames stay off it.
    const nodes = Object.values(registry.get(bound.store.scenes)[bound.root].nodes);
    const offLattice = nodes
      .filter((node) => onLattice(node))
      .filter((node) => {
        const bounds = nodeBounds(node);
        return JSON.stringify(quantize(bounds, DEFAULT_LATTICE)) !== JSON.stringify(bounds);
      })
      .map((node) => node.id);
    expect(offLattice).toEqual([]);
    bound.dispose();
  });

  test('every level of the combined set opens the diagram its boxes name', async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([Drawing.Drawing, Drawing.Canvas]);
    const set = architectureDiagrams(files);
    const drawings = await loadDiagramDrawings(db, set);
    await db.flush();

    // Composer's EDGE box opens the EDGE overview, and a detail diagram's box opens a third level.
    expect(set.drills.composer.Edge).toBe('edge');
    for (const [parent, drills] of Object.entries(set.drills)) {
      const content = drawings.get(parent)?.canvas.target?.content ?? {};
      for (const [box, target] of Object.entries(drills)) {
        const record = content[nodeKey(elementId(box, 'box'))];
        const node = isNodeRecord(record) ? record.node : undefined;
        const object: unknown = node && Reflect.get(node, 'object');
        const child = drawings.get(target);
        // A stored reference is local to the space, so the object id is what names the drawing.
        expect({ parent, box, target: Ref.isRef(object) ? object.uri.split('/').at(-1) : undefined }).toEqual({
          parent,
          box,
          target: child?.id,
        });
      }
    }
  });
});

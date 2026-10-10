//
// Copyright 2026 DXOS.org
//

import * as Registry from 'effect/reactivity/AtomRegistry';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { EchoTestBuilder } from '@dxos/echo-client/testing';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import { DEFAULT_LATTICE, isFrameNode, nodeBounds, onLattice, quantize } from '@dxos/react-ui-canvas/scene';

import { bindCanvasStore, elementId, parseLinkedSceneId } from '#model';

import { composerDiagrams, diagramFiles, edgeDiagrams } from './architecture.ts';
import { loadDiagramSet } from './diagrams.ts';

const DIR = join(import.meta.dirname, '../../docs/diagrams');
const files = Object.fromEntries(
  readdirSync(DIR)
    .filter((name) => name.endsWith('.dx.svg'))
    .map((name) => [name, readFileSync(join(DIR, name), 'utf8')]),
);

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
});

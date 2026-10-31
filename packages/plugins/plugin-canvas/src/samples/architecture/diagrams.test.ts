//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { DEFAULT_LATTICE, nodeBounds, onLattice, quantize } from '@dxos/react-ui-canvas';
import { isViewNode } from '@dxos/scene';

import { elementId, isNodeRecord, nodeKey, objectUri, readViews, rootOf } from '#model';

import { DIAGRAM_COMMANDS as files } from './compiled.ts';
import {
  DIAGRAM_BOX_TONE,
  DIAGRAM_GROUP_TONE,
  canvasDrawingSchemas,
  loadDiagramDrawings,
  loadDiagramSet,
  readDrawingContent,
} from './diagrams.ts';
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
    graph.registry.add(canvasDrawingSchemas);
    const set = makeSet(diagramFiles(files, prefix));
    const root = await loadDiagramSet(db, set);
    await db.flush();

    const rootNodes = () => {
      const content = readDrawingContent(root);
      return readViews(content)[rootOf(content) ?? '']?.nodes ?? {};
    };
    const drills = Object.keys(set.drills[set.root]).map((box) => elementId(box, 'box'));
    const linked = () =>
      drills.filter((id) => {
        const node = rootNodes()[id];
        return isViewNode(node) && objectUri(node) !== undefined;
      });
    await expect.poll(linked).toEqual(drills);

    // The layout lands every box on a lattice cell, so links route along the gutters; group frames stay off it.
    const nodes = Object.values(rootNodes());
    const offLattice = nodes
      .filter((node) => onLattice(node))
      .filter((node) => {
        const bounds = nodeBounds(node);
        return JSON.stringify(quantize(bounds, DEFAULT_LATTICE)) !== JSON.stringify(bounds);
      })
      .map((node) => node.id);
    expect(offLattice).toEqual([]);
  });

  test('every level of the combined set opens the diagram its boxes name', async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add(canvasDrawingSchemas);
    const set = architectureDiagrams(files);
    const drawings = await loadDiagramDrawings(db, set);
    await db.flush();

    // Composer's EDGE box opens the EDGE overview, and a detail diagram's box opens a third level.
    expect(set.drills.composer.Edge).toBe('edge');
    for (const [parent, drills] of Object.entries(set.drills)) {
      const drawing = drawings.get(parent);
      const content = drawing ? readDrawingContent(drawing) : {};
      for (const [box, target] of Object.entries(drills)) {
        const record = content[nodeKey(elementId(box, 'box'))];
        const node = isNodeRecord(record) ? record.node : undefined;
        const uri = node && isViewNode(node) ? objectUri(node) : undefined;
        const child = drawings.get(target);
        // A stored reference is local to the space, so the object id is what names the drawing.
        expect({ parent, box, target: uri?.split('/').at(-1) }).toEqual({
          parent,
          box,
          target: child?.id,
        });
      }
    }
  });

  test('every drawing styles plain boxes, group outlines and hues by the house rules', async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add(canvasDrawingSchemas);
    const drawings = await loadDiagramDrawings(db, architectureDiagrams(files));
    expect(drawings.size).toBe(15);

    const violations: string[] = [];
    for (const [id, drawing] of drawings) {
      const nodes = Object.values(readDrawingContent(drawing))
        .filter(isNodeRecord)
        .map((record) => record.node);
      expect(nodes.some((node) => node.style?.guide && node.style.lineStyle === 'dashed')).toBe(true);
      for (const node of nodes) {
        const style = node.style ?? {};
        const plain = (style.hue ?? 'neutral') === 'neutral';
        if (style.guide && style.lineStyle === 'dashed' && style.tone !== DIAGRAM_GROUP_TONE) {
          violations.push(`${id} ${node.id}: dashed group at tone ${style.tone}`);
        }
        if (!style.guide && plain && style.tone !== DIAGRAM_BOX_TONE) {
          violations.push(`${id} ${node.id}: plain box at tone ${style.tone}`);
        }
        // An unset tone draws at the style set's default variant, which is tone 2 in the default sets.
        if (plain && (style.tone ?? 2) === 2) {
          violations.push(`${id} ${node.id}: grey at tone 2`);
        }
        if (style.hue === 'yellow' || style.hue === 'amber') {
          violations.push(`${id} ${node.id}: ${style.hue}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  test('every scene colours some of its boxes, never all of them', async () => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add(canvasDrawingSchemas);
    const drawings = await loadDiagramDrawings(db, architectureDiagrams(files));
    expect(drawings.size).toBe(15);

    const counts = [...drawings].map(([id, drawing]) => {
      // A drill-down box is a frame onto its child drawing, so it counts as a box of this scene.
      const boxes = Object.values(readDrawingContent(drawing))
        .filter(isNodeRecord)
        .map((record) => record.node)
        .filter((node) => !node.style?.guide && (node.type === 'rect' || node.type === 'view'));
      const coloured = boxes.filter((node) => (node.style?.hue ?? 'neutral') !== 'neutral').length;
      return { id, coloured: coloured > 0 && coloured < boxes.length };
    });
    expect(counts).toEqual([...drawings.keys()].map((id) => ({ id, coloured: true })));
  });
});

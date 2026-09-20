//
// Copyright 2026 DXOS.org
//

import { initialKeys } from './order.ts';
import { type Link, type Node, type Scene, type SceneId } from './types.ts';

export type SceneTree = { scenes: Scene[]; root: SceneId };

/**
 * A tree of scenes `depth` levels deep. Every scene holds a rectangle, an ellipse, a class, a text and
 * one link of each type; above the leaves it also holds two portals to child scenes. Ids are
 * deterministic so tests can name elements; every edge lies on the major grid so the untouched layout
 * is already snapped.
 */
export const createSceneTree = (depth: number, prefix = 'root'): SceneTree => {
  const scenes: Scene[] = [];
  const root = buildScene(depth, prefix, scenes);
  return { scenes, root };
};

const buildScene = (depth: number, name: string, scenes: Scene[]): SceneId => {
  const id = `scene:${name}`;
  const elementId = (suffix: string) => `${id}/${suffix}`;
  const z = initialKeys(8);
  const nodes: Node[] = [
    {
      type: 'rect',
      id: elementId('a'),
      z: z[1],
      center: { x: 256, y: 192 },
      size: { width: 256, height: 128 },
      label: `${name} · A`,
    },
    {
      type: 'ellipse',
      id: elementId('b'),
      z: z[2],
      center: { x: 704, y: 192 },
      rx: 128,
      ry: 64,
      label: `${name} · B`,
    },
    {
      type: 'text',
      id: elementId('t'),
      z: z[3],
      center: { x: 1280, y: 192 },
      size: { width: 384, height: 128 },
      text: `Scene "${name}". Pinch to zoom, drag to pan, double-click a portal.`,
    },
    {
      type: 'class',
      id: elementId('c'),
      z: z[4],
      center: { x: 256, y: 800 },
      size: { width: 256, height: 192 },
      name: `${name} · C`,
      attributes: ['id: string', 'name: string'],
      methods: ['save(): void'],
    },
  ];
  const links: Link[] = [
    { type: 'curve', id: elementId('ab'), z: z[0], source: { node: elementId('a') }, target: { node: elementId('b') } },
    { type: 'line', id: elementId('ac'), z: z[0], source: { node: elementId('a') }, target: { node: elementId('c') } },
    {
      type: 'spline',
      id: elementId('bc'),
      z: z[0],
      source: { node: elementId('b') },
      target: { node: elementId('c') },
      points: [{ x: 640, y: 512 }],
    },
  ];

  if (depth > 1) {
    const left = buildScene(depth - 1, `${name}/L`, scenes);
    const right = buildScene(depth - 1, `${name}/R`, scenes);
    // Portals keep the scene aspect (16:10) so the portal scale is uniform; 512×320 is the
    // smallest such size on the major grid.
    nodes.push(
      {
        type: 'scene',
        id: elementId('left'),
        z: z[5],
        center: { x: 704, y: 608 },
        size: { width: 512, height: 320 },
        scene: left,
      },
      {
        type: 'scene',
        id: elementId('right'),
        z: z[6],
        center: { x: 1344, y: 608 },
        size: { width: 512, height: 320 },
        scene: right,
      },
    );
  }

  scenes.push({
    id,
    name,
    nodes: Object.fromEntries(nodes.map((node) => [node.id, node])),
    links: Object.fromEntries(links.map((link) => [link.id, link])),
  });
  return id;
};

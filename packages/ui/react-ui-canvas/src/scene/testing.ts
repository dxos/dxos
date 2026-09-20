//
// Copyright 2026 DXOS.org
//

import { initialKeys } from './order.ts';
import { type Cell, type Scene, type SceneId } from './types.ts';

export type SceneTree = { scenes: Scene[]; root: SceneId };

/**
 * A tree of scenes `depth` levels deep. Every scene holds three rects, a text and two links; above
 * the leaves it also holds two portals to child scenes. Ids are deterministic so tests can name cells;
 * every edge lies on the default grid so the untouched layout is already snapped.
 */
export const createSceneTree = (depth: number, prefix = 'root'): SceneTree => {
  const scenes: Scene[] = [];
  const root = buildScene(depth, prefix, scenes);
  return { scenes, root };
};

const buildScene = (depth: number, name: string, scenes: Scene[]): SceneId => {
  const id = `scene:${name}`;
  const cellId = (suffix: string) => `${id}/${suffix}`;
  const z = initialKeys(8);
  const cells: Cell[] = [
    {
      kind: 'rect',
      id: cellId('a'),
      z: z[1],
      center: { x: 248, y: 200 },
      size: { width: 240, height: 144 },
      label: `${name} · A`,
    },
    {
      kind: 'rect',
      id: cellId('b'),
      z: z[2],
      center: { x: 648, y: 200 },
      size: { width: 240, height: 144 },
      label: `${name} · B`,
    },
    {
      kind: 'text',
      id: cellId('t'),
      z: z[3],
      center: { x: 1256, y: 192 },
      size: { width: 400, height: 128 },
      text: `Scene "${name}". Pinch to zoom, drag to pan, double-click a portal.`,
    },
    {
      kind: 'rect',
      id: cellId('c'),
      z: z[4],
      center: { x: 248, y: 784 },
      size: { width: 240, height: 160 },
      label: `${name} · C`,
    },
    { kind: 'link', id: cellId('ab'), z: z[0], source: { cell: cellId('a') }, target: { cell: cellId('b') } },
    { kind: 'link', id: cellId('ac'), z: z[0], source: { cell: cellId('a') }, target: { cell: cellId('c') } },
  ];

  if (depth > 1) {
    const left = buildScene(depth - 1, `${name}/L`, scenes);
    const right = buildScene(depth - 1, `${name}/R`, scenes);
    // Portals keep the scene aspect (16:10) so the portal scale is uniform; 512×320 is the
    // smallest such size on the grid.
    cells.push(
      {
        kind: 'scene',
        id: cellId('left'),
        z: z[5],
        center: { x: 640, y: 624 },
        size: { width: 512, height: 320 },
        scene: left,
      },
      {
        kind: 'scene',
        id: cellId('right'),
        z: z[6],
        center: { x: 1248, y: 624 },
        size: { width: 512, height: 320 },
        scene: right,
      },
    );
  }

  scenes.push({ id, name, cells: Object.fromEntries(cells.map((cell) => [cell.id, cell])) });
  return id;
};

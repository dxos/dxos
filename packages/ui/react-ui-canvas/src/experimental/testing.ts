//
// Copyright 2026 DXOS.org
//

import { type Bounds, type Cell, type Scene, type SceneStore } from './types.ts';

const SCENE_BOUNDS: Bounds = { x: 0, y: 0, width: 1600, height: 1000 };

let counter = 0;
const nextId = (prefix: string) => `${prefix}-${++counter}`;

/**
 * Builds a tree of scenes `depth` levels deep. Every scene holds a few rects and texts, two links, and
 * (above the leaves) two portal cells pointing at child scenes with the same aspect ratio.
 */
export const createSceneTree = (depth: number): { store: SceneStore; root: string } => {
  const store: SceneStore = {};
  const root = buildScene(depth, 'root', store);
  return { store, root };
};

const buildScene = (depth: number, name: string, store: SceneStore): string => {
  const id = nextId('scene');
  const cells: Cell[] = [
    {
      id: nextId('cell'),
      kind: 'rect',
      z: 1,
      center: { x: 250, y: 200 },
      size: { width: 240, height: 140 },
      label: `${name} · A`,
    },
    {
      id: nextId('cell'),
      kind: 'rect',
      z: 2,
      center: { x: 650, y: 160 },
      size: { width: 240, height: 140 },
      label: `${name} · B`,
    },
    {
      id: nextId('cell'),
      kind: 'text',
      z: 3,
      center: { x: 1250, y: 180 },
      size: { width: 400, height: 120 },
      text: `Scene "${name}". Pinch to zoom, drag to pan, double-click a portal.`,
    },
    {
      id: nextId('cell'),
      kind: 'rect',
      z: 4,
      center: { x: 300, y: 780 },
      size: { width: 300, height: 160 },
      label: `${name} · C`,
    },
  ];
  const [a, b, , c] = cells;
  cells.push(
    { id: nextId('link'), kind: 'link', z: 0, source: a.id, target: b.id },
    { id: nextId('link'), kind: 'link', z: 0, source: a.id, target: c.id },
  );

  if (depth > 1) {
    const leftId = buildScene(depth - 1, `${name}/L`, store);
    const rightId = buildScene(depth - 1, `${name}/R`, store);
    // Portals keep the scene aspect (16:10) so the portal scale is uniform.
    cells.push(
      {
        id: nextId('portal'),
        kind: 'scene',
        z: 5,
        center: { x: 640, y: 620 },
        size: { width: 480, height: 300 },
        scene: leftId,
      },
      {
        id: nextId('portal'),
        kind: 'scene',
        z: 6,
        center: { x: 1250, y: 620 },
        size: { width: 480, height: 300 },
        scene: rightId,
      },
    );
  }

  const scene: Scene = {
    id,
    name,
    bounds: SCENE_BOUNDS,
    cells: Object.fromEntries(cells.map((cell) => [cell.id, cell])),
  };
  store[id] = scene;
  return id;
};

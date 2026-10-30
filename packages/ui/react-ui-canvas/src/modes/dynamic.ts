//
// Copyright 2026 DXOS.org
//

//
// Dynamic mode on the shared model (decision 14): the layout's shapes are the graph's nodes and its links the graph's
// edges. A graph edit re-runs the layout engine over the shapes a person has not placed; a shape they moved is pinned
// where they dropped it (its centre is the overlay), so the engine leaves it there.
//

import { type LayoutIntent, type Scene, applyIntent, endpointNode } from '@dxos/scene';

import { type GraphModel, type GraphPlacement, graphCenters } from '../engine/index.ts';
import { type Arrangement } from '../utils/index.ts';

type Element = Scene.Element2D;
type Point = { x: number; y: number };

/** The `arrange` kind that makes a layout dynamic. */
export const DYNAMIC_ARRANGE = 'dynamic';

const ARRANGEMENTS: readonly Arrangement[] = ['rank', 'crossings', 'force', 'force-free', 'routed'];

const isArrangement = (value: unknown): value is Arrangement => ARRANGEMENTS.some((kind) => kind === value);

const isLink = (element: Element): boolean => element.source !== undefined || element.target !== undefined;

const samePoint = (left: Point | undefined, right: Point | undefined): boolean =>
  left?.x === right?.x && left?.y === right?.y;

/** The layout as a graph: every shape a node, every link between two shapes an edge. */
const graphOf = (layout: Scene.LayoutRecord2D): GraphModel => {
  const elements = Object.values(layout.elements);
  const shapes = new Set(elements.filter((element) => !isLink(element)).map(({ id }) => id));
  return {
    nodes: [...shapes].map((id) => ({ id })),
    edges: elements.flatMap((element) => {
      const from = element.source && endpointNode(element.source);
      const to = element.target && endpointNode(element.target);
      return isLink(element) && from !== undefined && to !== undefined && shapes.has(from) && shapes.has(to)
        ? [{ id: element.id, from, to }]
        : [];
    }),
  };
};

const signature = ({ nodes, edges }: GraphModel): string =>
  JSON.stringify([nodes.map(({ id }) => id).sort(), edges.map(({ id, from, to }) => `${id}:${from}>${to}`).sort()]);

/** How the layout's engine places its graph: the layout's lattice, and the arrangement its `arrange` names. */
const placementOf = (layout: Scene.LayoutRecord2D): GraphPlacement => {
  const arrange = layout.arrange?.params?.arrange;
  return {
    ...(isArrangement(arrange) ? { arrange } : {}),
    // A free force layout leaves shapes between cells, so it keeps neither the lattice's cells nor its routes.
    ...(layout.lattice && arrange !== 'force-free' ? { lattice: layout.lattice } : {}),
  };
};

/** Whether the layout is in dynamic mode. */
export const isDynamicLayout = (layout: Scene.LayoutRecord): boolean =>
  layout.dim === '2d' && layout.arrange?.kind === DYNAMIC_ARRANGE;

/**
 * `intent` in dynamic mode: a shape it moves is pinned there, and an edit that changes the graph (a shape or link
 * added or removed) also re-places every unpinned shape by the layout engine. Any other edit, and any layout not in
 * dynamic mode, is written as given; dynamic mode refuses nothing.
 */
export const dynamicConstrain = (layout: Scene.LayoutRecord2D, intent: LayoutIntent): LayoutIntent | undefined => {
  if (!isDynamicLayout(layout)) {
    return intent;
  }
  const next = applyIntent(layout, intent);
  // The 2D engine writes a drag as the whole element, so a changed centre pins a shape as a move does.
  const pinned = Object.values(next.elements).filter((element) => {
    const before = layout.elements[element.id];
    return !isLink(element) && before !== undefined && !samePoint(before.center, element.center);
  });
  const pins: LayoutIntent[] = pinned
    .filter((element) => !element.pinned)
    .map(({ id }) => ({ kind: 'update', id, path: ['pinned'], value: true }));
  const graph = graphOf(next);
  if (signature(graphOf(layout)) === signature(graph)) {
    return pins.length === 0 ? intent : { kind: 'batch', intents: [intent, ...pins] };
  }
  const fixed = new Set(pinned.map(({ id }) => id));
  const overlay: Record<string, Point> = {};
  for (const element of Object.values(next.elements)) {
    if (!isLink(element) && element.center && (element.pinned || fixed.has(element.id))) {
      overlay[element.id] = element.center;
    }
  }
  const centers = graphCenters(graph, { positions: overlay }, placementOf(layout));
  const placed: LayoutIntent[] = [...centers].flatMap(([id, center]): LayoutIntent[] =>
    overlay[id] === undefined && !samePoint(next.elements[id]?.center, center)
      ? [{ kind: 'update', id, path: ['center'], value: center }]
      : [],
  );
  return { kind: 'batch', intents: [intent, ...pins, ...placed] };
};

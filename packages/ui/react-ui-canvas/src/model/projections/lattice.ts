//
// Copyright 2026 DXOS.org
//

//
// Lattice projection (docs/DESIGN.md §8b): freehand semantics, with every change to a node's geometry
// snapped onto the lattice and refused when it would overlap another node's cells. Nodes stay in scene
// pixels, so a lattice scene is stored exactly as a freehand one; the rule lives here, not in the data.
//

import {
  DEFAULT_LATTICE,
  type LatticeSpec,
  cellBounds,
  collides,
  coveredCells,
  occupancy,
  quantize,
  resizeCell,
  toCell,
} from '../../utils/lattice.ts';
import { nodeBounds, resizeNode } from '../../utils/shapes.ts';
import {
  type FreehandProjectionOptions,
  type Projection,
  createFreehandProjection,
  freehandCapabilities,
  reduceIntent,
} from '../projection.ts';
import { type Bounds, type Capabilities, type ElementId, type Intent, type Node, type Scene } from '../types.ts';

/** Freehand, without auto layout: arranging by a layout engine would not respect the lattice. */
export const latticeCapabilities: Capabilities = { ...freehandCapabilities, layout: false };

/** The bounds `node` would have after `values` (a geometry `update`), or undefined when they touch no geometry. */
const updatedBounds = (node: Node, values: object): Bounds | undefined => {
  const center = 'center' in values && isPoint(values.center) ? values.center : undefined;
  const size = 'size' in values && isSize(values.size) ? values.size : undefined;
  if (!center && !size) {
    return undefined;
  }
  return nodeBounds({ ...node, center: center ?? node.center, size: size ?? node.size });
};

const isPoint = (value: unknown): value is { x: number; y: number } =>
  typeof value === 'object' && value !== null && 'x' in value && 'y' in value;

const isSize = (value: unknown): value is { width: number; height: number } =>
  typeof value === 'object' && value !== null && 'width' in value && 'height' in value;

/** Whether `bounds` (snapped) would overlap a node other than `except`. */
const blocked = (scene: Scene, spec: LatticeSpec, bounds: Bounds, except: ReadonlySet<ElementId>): boolean =>
  collides(toCell(bounds, spec), occupancy(Object.values(scene.nodes), spec, except));

/**
 * `intent` rewritten onto the lattice, or undefined when it would overlap occupied cells. Geometry
 * (create, move, resize, a centre or size `update`) is snapped; everything else passes through. A batch
 * is checked step by step against the scene each step leaves, and is refused whole if any step is.
 */
export const constrainIntent = (scene: Scene, intent: Intent, spec: LatticeSpec): Intent | undefined => {
  switch (intent.kind) {
    case 'create': {
      const bounds = quantize(nodeBounds(intent.node), spec);
      return blocked(scene, spec, bounds, new Set())
        ? undefined
        : { kind: 'create', node: resizeNode(intent.node, bounds) };
    }

    case 'resize': {
      // The dragged edge snaps to a cell edge and the opposite edge stays, so a face steps one cell at a time.
      const node = scene.nodes[intent.id];
      const from = node && nodeBounds(node);
      const bounds = from
        ? cellBounds(resizeCell(toCell(from, spec), from, intent.bounds, spec), spec)
        : quantize(intent.bounds, spec);
      return blocked(scene, spec, bounds, new Set([intent.id])) ? undefined : { kind: 'resize', id: intent.id, bounds };
    }

    case 'move': {
      // Each moved node snaps on its own; together they must clear the nodes left behind and each other.
      const moving = new Set(intent.ids);
      const others = occupancy(Object.values(scene.nodes), spec, moving);
      const taken = new Map<string, ElementId>();
      const intents: Intent[] = [];
      for (const id of intent.ids) {
        const node = scene.nodes[id];
        if (!node || node.locked) {
          continue;
        }
        const from = nodeBounds(node);
        const bounds = quantize({ ...from, x: from.x + intent.delta.x, y: from.y + intent.delta.y }, spec);
        const cell = toCell(bounds, spec);
        if (collides(cell, others) || collides(cell, taken)) {
          return undefined;
        }
        for (const key of coveredCells(cell)) {
          taken.set(key, id);
        }
        intents.push({ kind: 'resize', id, bounds });
      }
      return { kind: 'batch', intents };
    }

    case 'update': {
      const node = scene.nodes[intent.id];
      const bounds = node && updatedBounds(node, intent.values);
      if (!node || !bounds) {
        return intent;
      }
      const snapped = quantize(bounds, spec);
      if (blocked(scene, spec, snapped, new Set([intent.id]))) {
        return undefined;
      }
      const placed = resizeNode(node, snapped);
      return { kind: 'update', id: intent.id, values: { ...intent.values, center: placed.center, size: placed.size } };
    }

    case 'batch': {
      let working = scene;
      const intents: Intent[] = [];
      for (const step of intent.intents) {
        const constrained = constrainIntent(working, step, spec);
        if (!constrained) {
          return undefined;
        }
        intents.push(constrained);
        working = reduceIntent(working, constrained);
      }
      return { kind: 'batch', intents };
    }

    case 'layout':
      return undefined;

    default:
      return intent;
  }
};

export type LatticeProjectionOptions = FreehandProjectionOptions & {
  spec?: LatticeSpec;
};

/**
 * Freehand over the store, with geometry kept on the lattice; an intent that would overlap is refused. While
 * `constrained` says no (the view's snap is off) intents pass through as freehand, and a shape left off the
 * lattice snaps onto it the next time it is moved.
 */
export const createLatticeProjection = ({
  registry,
  store,
  sceneId,
  constrained = () => true,
  spec = DEFAULT_LATTICE,
}: LatticeProjectionOptions): Projection => {
  const freehand = createFreehandProjection({ registry, store, sceneId });
  const constrain = (intent: Intent) =>
    constrained() ? constrainIntent(registry.get(freehand.scene), intent, spec) : intent;
  return {
    ...freehand,
    capabilities: latticeCapabilities,
    lattice: spec,
    constrain,
    apply: (intent) => {
      const constrained = constrain(intent);
      if (constrained) {
        freehand.apply(constrained);
      }
    },
  };
};

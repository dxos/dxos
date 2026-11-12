//
// Copyright 2026 DXOS.org
//

//
// Editing an Object in place. A double-click on an Instance used to open its definition on its own, which moved the
// camera and took the drawing away; here the editor stays where it is and the Instance's parts become the things it
// acts on, with the rest of the scene faded behind them (what `Scene3DEditor` has always done in 3D).
//
// The parts are shown where the Instance draws them, so an edit lands in the scene's own coordinates and has to be
// written back into the definition's. Which of the two it is written to is the rule the user set: a part's text
// belongs to this Instance (`overrides`), and everything else — style, geometry, what parts there are — belongs to
// the definition, so it reaches every Instance of it.
//

import {
  type ElementId,
  type InstanceNode,
  type Link,
  type Node,
  type NodeId,
  type PartLayout,
  type PlacedComposite,
  type Point,
  type ViewId,
  nodeFrame,
  unsolvePartBounds,
} from '@dxos/scene';

import { type NodeRegistry, type RenderList2D } from '../model/index.ts';
import { compositeBounds, drawnParts, instanceView } from './compose.ts';
import { containsPoint, unionBounds } from './hit.ts';
import { nodeParts } from './parts.ts';
import { nodeBounds, resizeNode } from './shapes.ts';

/** The Object being edited in place: the Instance entered, and the definition its parts come from. */
export type Inside = { instance: NodeId; composite: ViewId };

/** What the editor shows while inside an Object: one scene, and which of its elements are the Object's own parts. */
export type InsideScene = { scene: RenderList2D; parts: ReadonlySet<ElementId> };

/**
 * Whether `point` is off the Object being edited: outside the frame its parts fill in `scene`, the scene the editor
 * shows while inside it. A press between two parts is still on the Object, so it does not leave it.
 */
export const leavesObject = (scene: RenderList2D, composite: RenderList2D, point: Point): boolean => {
  const frame = unionBounds(
    Object.keys(composite.nodes).flatMap((id) => (scene.nodes[id] ? [nodeBounds(scene.nodes[id])] : [])),
  );
  return frame === undefined || !containsPoint(frame, point);
};

/**
 * The outer scene with the Instance replaced by its parts, drawn where it drew them. Everything else is locked, so a
 * gesture inside an Object never moves the drawing around it; leaving puts the Instance back.
 */
export const insideScene = (
  outer: RenderList2D,
  instance: PlacedComposite,
  composite: RenderList2D,
  registry?: NodeRegistry,
): InsideScene => {
  const drawn = drawnParts(instance, composite, registry && ((node) => nodeParts(registry, node)));
  const parts = new Set<ElementId>([...Object.keys(drawn.nodes), ...Object.keys(drawn.links)]);
  const locked = <T extends Node | Link>(element: T): T => ({ ...element, locked: true });
  const nodes = Object.fromEntries(
    Object.values(outer.nodes)
      .filter((node) => node.id !== instance.id)
      .map((node) => [node.id, locked(node)]),
  );
  const links = Object.fromEntries(Object.values(outer.links).map((link) => [link.id, locked(link)]));
  return {
    scene: {
      ...outer,
      nodes: { ...nodes, ...drawn.nodes },
      links: { ...links, ...drawn.links },
    },
    parts,
  };
};

/** What an edit made inside an Object writes: the definition it changed, and this Instance's own overrides. */
export type InsideWrites = {
  composite?: RenderList2D;
  overrides?: InstanceNode['overrides'];
  /** Fields of the Instance itself that a bound part wrote (a UML class's `attributes`). */
  bound?: Record<string, unknown>;
};

/** The frame a part's coordinates are solved between: the definition's own box, and the Instance's frame. */
const context = (instance: PlacedComposite, composite: RenderList2D) => {
  const from = nodeFrame(instance) ?? compositeBounds(composite);
  return from ? { from, to: nodeBounds(instance) } : undefined;
};

/** A node's text fields, which belong to the Instance that shows them rather than to the definition. */
const textFields = (registry: NodeRegistry, node: Node): ReadonlySet<string> =>
  new Set(nodeParts(registry, node).map(({ field }) => field));

const changed = (left: unknown, right: unknown): boolean => JSON.stringify(left) !== JSON.stringify(right);

/**
 * A part as the definition should store it: the edited node put back in the composite's coordinates, with the fields
 * that belong to the Instance taken out. Geometry inverts through the part's own constraint, so a part dragged in a
 * stretched Instance lands where it was dragged in every other one.
 */
const toDefinition = (
  edited: Node,
  layout: PartLayout | undefined,
  frames: { from: ReturnType<typeof nodeBounds>; to: ReturnType<typeof nodeBounds> } | undefined,
): Node => (frames ? resizeNode(edited, unsolvePartBounds(nodeBounds(edited), frames, layout)) : edited);

/**
 * What an edit of `edited` writes. `parts` names the elements that are the Object's; anything else in the scene is the
 * drawing around it and is left alone. A part that is gone leaves the definition, and one that is new joins it.
 */
export const insideWrites = (
  registry: NodeRegistry,
  instance: PlacedComposite,
  composite: RenderList2D,
  edited: RenderList2D,
  parts: ReadonlySet<ElementId>,
): InsideWrites => {
  const frames = context(instance, composite);
  // The parts are compared against what this Instance draws, so an override it already carries reads as unchanged.
  const shown = instanceView(instance, composite, (node) => nodeParts(registry, node));
  const bound: Record<string, unknown> = {};
  const overrides: Record<NodeId, Record<string, unknown>> = { ...instance.overrides };
  const nodes: Record<NodeId, Node> = {};
  let overridesChanged = false;

  for (const node of Object.values(edited.nodes)) {
    if (!parts.has(node.id)) {
      continue;
    }
    const stored = composite.nodes[node.id];
    const placed = toDefinition(node, stored?.constrain, frames);
    // A part added inside the Object joins the definition whole: it has no Instance of its own to belong to.
    if (!stored) {
      nodes[node.id] = placed;
      continue;
    }
    const text = textFields(registry, stored);
    const current = shown.nodes[node.id] ?? stored;
    const definition: Record<string, unknown> = { ...stored };
    const own: Record<string, unknown> = { ...overrides[node.id] };
    for (const [key, value] of Object.entries(placed)) {
      if (!text.has(key)) {
        definition[key] = value;
        continue;
      }
      // Text the person did not touch leaves what holds it as it was.
      if (!changed(value, Reflect.get(current, key))) {
        continue;
      }
      // A bound part shows the Instance's own field, so typing in it writes that field rather than an override.
      if (stored.bind !== undefined) {
        bound[stored.bind] = Array.isArray(Reflect.get(instance, stored.bind))
          ? String(value ?? '')
              .split('\n')
              .map((line) => line.trim())
              .filter((line) => line.length > 0)
          : value;
        continue;
      }
      changed(value, Reflect.get(stored, key)) ? (own[key] = value) : delete own[key];
      overridesChanged = true;
    }
    Object.keys(own).length > 0 ? (overrides[node.id] = own) : delete overrides[node.id];
    nodes[node.id] = definition as Node;
  }
  // A part deleted inside the Object takes its override with it.
  for (const id of Object.keys(overrides)) {
    if (!nodes[id]) {
      delete overrides[id];
      overridesChanged = true;
    }
  }

  const links = Object.fromEntries(
    Object.values(edited.links)
      .filter((link) => parts.has(link.id))
      .map((link) => [link.id, link]),
  );
  const next: RenderList2D = { ...composite, nodes, links };
  return {
    ...(Object.keys(bound).length > 0 ? { bound } : {}),
    ...(changed(next, composite) ? { composite: next } : {}),
    ...(overridesChanged || changed(overrides, instance.overrides ?? {})
      ? { overrides: Object.keys(overrides).length > 0 ? overrides : undefined }
      : {}),
  };
};

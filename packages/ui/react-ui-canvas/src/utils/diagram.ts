//
// Copyright 2026 DXOS.org
//

//
// Bridge from the scene engine to `@dxos/diagram`'s scene, so its `Diagnostics` and `Objective` —
// the measurements the layout engines are selected by — can grade a scene a person is editing.
//

import { type Scene as Diagram } from '@dxos/diagram';

import { type NodeRegistry } from '../model/registry.ts';
import {
  type ElementId,
  type Link,
  type Node,
  type Point,
  type Scene,
  isClassNode,
  isEllipseNode,
  isNoteNode,
  isRectNode,
} from '../model/types.ts';
import { curvePoint, linkGeometry, smartPoints } from './route.ts';
import { nodeBounds } from './shapes.ts';

/** Samples per curve: enough for crossings and routes-through-node to see the arc, not just its chord. */
const CURVE_SAMPLES = 8;

export type DiagramObjects = {
  objects: Diagram.WorldObject[];
  /** Scene element id for each diagram object id, to map a diagnostic's refs back onto the scene. */
  elementOf: ReadonlyMap<string, ElementId>;
};

/**
 * `Diagnostics` reads the owning object as the ref's prefix up to `/`, and `#` as a port; percent-encoding
 * removes both and stays injective, so distinct ids never merge into one owner.
 */
const objectId = (id: ElementId): string => encodeURIComponent(id);

const nodeText = (node: Node): string | undefined => {
  if (isRectNode(node) || isEllipseNode(node)) {
    return node.label;
  }
  if (isClassNode(node)) {
    return node.name;
  }
  if (isNoteNode(node)) {
    return node.text;
  }
  return undefined;
};

/** The polyline a link is drawn along, in scene coordinates. */
const linkPoints = (scene: Scene, registry: NodeRegistry, link: Link): Point[] | undefined => {
  const geometry = linkGeometry(scene, registry, link);
  if (!geometry) {
    return undefined;
  }
  const { source, target } = geometry;
  switch (link.type) {
    case 'line':
      return [source.point, target.point];
    case 'spline':
      return [source.point, ...link.points, target.point];
    case 'smart':
      return smartPoints(source, target);
    case 'curve':
      return Array.from({ length: CURVE_SAMPLES + 1 }, (_, index) => curvePoint(source, target, index / CURVE_SAMPLES));
  }
};

/**
 * One diagram object per node (a box with its label) and per link (a polyline), so `Diagnostics`
 * compares nodes across objects exactly as it does for an engine's output. Nodes that enclose
 * others read as containers there, which is what a guide frame around a group is.
 */
export const toDiagramObjects = (scene: Scene, registry: NodeRegistry): DiagramObjects => {
  const elementOf = new Map<string, ElementId>();
  const objects: Diagram.WorldObject[] = [];
  for (const node of Object.values(scene.nodes)) {
    const { x, y, width, height } = nodeBounds(node);
    const id = objectId(node.id);
    elementOf.set(id, node.id);
    objects.push({
      id,
      elements: [
        {
          kind: isEllipseNode(node) ? 'ellipse' : 'rect',
          id: 'box',
          x,
          y,
          w: width,
          h: height,
          ...(node.style?.guide ? {} : { text: nodeText(node) }),
        },
      ],
    });
  }
  for (const link of Object.values(scene.links)) {
    const points = linkPoints(scene, registry, link);
    if (!points || points.length < 2) {
      continue;
    }
    const id = objectId(link.id);
    elementOf.set(id, link.id);
    objects.push({ id, elements: [{ kind: 'line', id: 'path', points }] });
  }
  return { objects, elementOf };
};

/** The scene elements a diagnostic implicates, from its `object/element` refs. */
export const diagnosticElements = ({ elementOf }: DiagramObjects, refs: readonly string[]): ElementId[] =>
  refs.flatMap((ref) => {
    const element = elementOf.get(ref.slice(0, ref.indexOf('/')));
    return element ? [element] : [];
  });

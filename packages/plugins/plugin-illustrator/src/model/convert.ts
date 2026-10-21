//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Scene } from '@dxos/diagram';
import { Database } from '@dxos/echo';

import { Drawing, type IllustratorCapabilities, IllustratorError } from '#types';

/** How far (canvas px) an arrow end may sit from a box outline and still count as touching it. */
const TOUCH = 10;

type Placed = { ref: string; x: number; y: number; w: number; h: number };

const BOX_KINDS: ReadonlySet<string> = new Set(['rect', 'ellipse', 'diamond', 'triangle']);

/** Distance from a point to a rectangle's outline, whether the point is inside it or not. */
const outlineDistance = ({ x, y, w, h }: Placed, point: Scene.Point): number => {
  const dx = Math.max(x - point.x, 0, point.x - (x + w));
  const dy = Math.max(y - point.y, 0, point.y - (y + h));
  const outside = Math.hypot(dx, dy);
  return outside > 0 ? outside : Math.min(point.x - x, x + w - point.x, point.y - y, y + h - point.y);
};

/**
 * Laid-out diagrams route arrows as fixed points, which an editor cannot keep attached to a moved box;
 * naming the box each end touches lets the target variant bind the arrow so it follows.
 */
export const bindArrowEnds = (objects: readonly Scene.WorldObject[]): Scene.WorldObject[] => {
  const place = (object: Scene.WorldObject, point: Scene.Point): Scene.Point => {
    const scale = object.scale ?? 1;
    return { x: (object.origin?.x ?? 0) + point.x * scale, y: (object.origin?.y ?? 0) + point.y * scale };
  };
  const boxes: Placed[] = objects.flatMap((object) =>
    object.elements.flatMap((element) => {
      if (!BOX_KINDS.has(element.kind) || !('w' in element) || !('h' in element) || !('x' in element)) {
        return [];
      }
      const scale = object.scale ?? 1;
      const { x, y } = place(object, { x: element.x, y: element.y });
      return [{ ref: `${object.id}/${element.id}`, x, y, w: element.w * scale, h: element.h * scale }];
    }),
  );
  // The smallest touching box wins, so an end on a node inside a group frame binds to the node.
  const touching = (point: Scene.Point): string | undefined =>
    boxes
      .filter((box) => outlineDistance(box, point) <= TOUCH)
      .sort((left, right) => left.w * left.h - right.w * right.h)[0]?.ref;

  return objects.map((object) => ({
    ...object,
    elements: object.elements.map((element) => {
      if (element.kind !== 'arrow') {
        return element;
      }
      const from = element.from ?? (element.start ? touching(place(object, element.start)) : undefined);
      const to = element.to ?? (element.end ? touching(place(object, element.end)) : undefined);
      return { ...element, ...(from ? { from } : {}), ...(to ? { to } : {}) };
    }),
  }));
};

/**
 * The generic conversion: replays the source's scene onto a fresh canvas of the target variant, whose builder
 * re-derives its own records (and arrow bindings) from it; fails on shapes the scene DSL does not manage.
 */
export const convertByScene = Effect.fn(function* (
  source: Drawing.Canvas,
  { from, to }: { from: IllustratorCapabilities.DrawingVariant; to: IllustratorCapabilities.DrawingVariant },
) {
  const { scene, unmanaged: dropped } = from.builder.read(source);
  if (dropped > 0) {
    return yield* Effect.fail(new IllustratorError.UnmanagedShapes({ context: { variant: to.id, count: dropped } }));
  }
  // The source drew a laid-out diagram: a target that can draw the DSL as the diagram renderer does is asked to.
  const canvas = yield* Database.add(
    to.createCanvas ? yield* to.createCanvas({ diagramShapes: true }) : Drawing.makeCanvas({ schema: to.id }),
  );
  const { upserted } = to.builder.apply(
    canvas,
    bindArrowEnds(scene.objects).map((object) => ({ op: 'upsert-object' as const, object })),
  );
  return { canvas, upserted };
});

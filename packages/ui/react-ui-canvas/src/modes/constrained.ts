//
// Copyright 2026 DXOS.org
//

//
// Constrained mode on the shared model (decision 14): the layout's `constraints` relate its shapes by element id, and
// the solver places every shape on the grid from them. A shape a person drops is re-related to its nearest neighbour
// (east/west and aligned, or north/south), then the solver re-places them all.
//

import { type LayoutIntent, type Scene, applyIntent } from '@dxos/scene';

import { centeredOrigin } from '../utils/index.ts';
import { CONSTRAINED_GRID, solveRanks } from './ranks.ts';

type Element = Scene.Element2D;
type Point = { x: number; y: number };

const isShape = (element: Element): boolean => element.source === undefined && element.target === undefined;

const samePoint = (left: Point | undefined, right: Point | undefined): boolean =>
  left?.x === right?.x && left?.y === right?.y;

/**
 * The centre writes that place the layout's shapes where `constraints` solve them (the layout's own by default): rows
 * ranked by north/south, columns within a row by east/west, on the grid and straddling the origin. Only shapes that
 * move are written.
 */
export const constrainedPlacement = (
  layout: Scene.LayoutRecord2D,
  constraints: readonly Scene.Constraint[] = layout.constraints ?? [],
): LayoutIntent => {
  const { pitch, size } = CONSTRAINED_GRID;
  const shapes = Object.values(layout.elements).filter(isShape);
  const { rows, columns } = solveRanks({ nodes: shapes.map(({ id }) => ({ id })), constraints: [...constraints] });
  const extent = { columns: Math.max(...columns.values(), 0) + 1, rows: Math.max(...rows.values(), 0) + 1 };
  const origin = centeredOrigin(extent, pitch, size);
  return {
    kind: 'batch',
    intents: shapes.flatMap((element): LayoutIntent[] => {
      const center = {
        x: origin.x + (columns.get(element.id) ?? 0) * pitch.width,
        y: origin.y + (rows.get(element.id) ?? 0) * pitch.height,
      };
      return samePoint(element.center, center)
        ? []
        : [{ kind: 'update', id: element.id, path: ['center'], value: center }];
    }),
  };
};

/**
 * `constraints` with `id` re-related from where it was dropped (`at`): the nearest other shape becomes its reference; a
 * mostly horizontal offset makes it east/west of and aligned with that shape, a mostly vertical one north/south of it.
 * Unchanged when there is no other shape.
 */
const dropAt = (
  layout: Scene.LayoutRecord2D,
  constraints: readonly Scene.Constraint[],
  id: string,
  at: Point,
): Scene.Constraint[] => {
  let nearest: { id: string; dx: number; dy: number } | undefined;
  let best = Infinity;
  for (const element of Object.values(layout.elements)) {
    if (element.id === id || !isShape(element) || !element.center) {
      continue;
    }
    const dx = at.x - element.center.x;
    const dy = at.y - element.center.y;
    if (dx * dx + dy * dy < best) {
      best = dx * dx + dy * dy;
      nearest = { id: element.id, dx, dy };
    }
  }
  if (!nearest) {
    return [...constraints];
  }
  const kept = constraints.filter(({ subject, object }) => subject !== id && object !== id);
  const added: Scene.Constraint[] =
    Math.abs(nearest.dx) >= Math.abs(nearest.dy)
      ? [
          { subject: id, relation: nearest.dx > 0 ? 'east' : 'west', object: nearest.id },
          { subject: id, relation: 'aligned', object: nearest.id },
        ]
      : [{ subject: id, relation: nearest.dy > 0 ? 'south' : 'north', object: nearest.id }];
  return [...kept, ...added];
};

/**
 * `intent` in constrained mode, with the layout's constraints after it: a shape it moves or creates is re-related to
 * its nearest neighbour where it lands, a shape it deletes takes its constraints with it, and every shape is then
 * re-placed by the solver. Any other edit leaves the constraints as they are.
 */
export const constrainedConstrain = (
  layout: Scene.LayoutRecord2D,
  intent: LayoutIntent,
): { intent: LayoutIntent; constraints: Scene.Constraint[] } | undefined => {
  const before = layout.constraints ?? [];
  const next = applyIntent(layout, intent);
  const removed = new Set(Object.keys(layout.elements).filter((id) => next.elements[id] === undefined));
  const dropped = Object.values(next.elements).filter(
    (element) =>
      isShape(element) &&
      element.center !== undefined &&
      !samePoint(layout.elements[element.id]?.center, element.center),
  );
  if (removed.size === 0 && dropped.length === 0) {
    return { intent, constraints: [...before] };
  }
  let constraints = before.filter(({ subject, object }) => !removed.has(subject) && !removed.has(object));
  for (const element of dropped) {
    constraints = element.center ? dropAt(layout, constraints, element.id, element.center) : constraints;
  }
  return { intent: { kind: 'batch', intents: [intent, constrainedPlacement(next, constraints)] }, constraints };
};

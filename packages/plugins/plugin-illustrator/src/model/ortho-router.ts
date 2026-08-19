//
// Copyright 2026 DXOS.org
//

//
// Obstacle-avoiding orthogonal router: A* over a fine grid with a turn-dominant cost, so a
// connector never crosses a node and takes the fewest bends that avoidance allows (length breaks
// ties). A shared usage penalty nudges later edges off cells earlier edges already run through.
// Plugs into the dialects via the `Router` contract (`uml-grid.ts`).
//

import type * as Scene from './scene';
import type { Rect, RoutedRelation, Router } from './uml-grid';

/** Grid step: the document fine grid, which ports and node borders already sit on. */
const STEP = 8;
/** Clearance kept between a route and any node border, in steps. */
const CLEARANCE = 1;
/** One bend costs as much as this many steps — turns dominate, distance breaks ties. */
const TURN_COST = 1000;
/** Traversing a cell another edge already used costs this many extra steps. */
const USED_COST = 24;
/** Margin around the diagram bounds the search may roam into, in steps. */
const MARGIN = 8;

type Point = Scene.Point;

const key = (x: number, y: number) => `${x}:${y}`;

/** Directions: right, down, left, up. */
const DX = [1, 0, -1, 0];
const DY = [0, 1, 0, -1];

/**
 * Creates a router that avoids the given node rects. Stateful across edges: earlier routes
 * penalize (not block) the cells they occupy, spreading parallel runs apart. `fallback` handles
 * the (fenced-in) edges the search cannot reach; imported types keep this module cycle-free.
 */
export const makeAvoidingRouter = (obstacles: Rect[], fallback: Router): Router => {
  const used = new Set<string>();

  // Inflated obstacle test, in grid coordinates.
  const inflated = obstacles.map((rect) => ({
    x0: Math.floor(rect.x / STEP) - CLEARANCE,
    y0: Math.floor(rect.y / STEP) - CLEARANCE,
    x1: Math.ceil((rect.x + rect.w) / STEP) + CLEARANCE,
    y1: Math.ceil((rect.y + rect.h) / STEP) + CLEARANCE,
  }));
  const blocked = (x: number, y: number) =>
    inflated.some((rect) => x > rect.x0 && x < rect.x1 && y > rect.y0 && y < rect.y1);

  const xs = obstacles.flatMap((rect) => [rect.x, rect.x + rect.w]);
  const ys = obstacles.flatMap((rect) => [rect.y, rect.y + rect.h]);
  const bounds = {
    x0: Math.floor(Math.min(...xs) / STEP) - MARGIN,
    y0: Math.floor(Math.min(...ys) / STEP) - MARGIN,
    x1: Math.ceil(Math.max(...xs) / STEP) + MARGIN,
    y1: Math.ceil(Math.max(...ys) / STEP) + MARGIN,
  };

  return (edge: RoutedRelation): Point[] => {
    const { from, to, horizontal, ports } = edge;
    // Terminal sides mirror the Z-router (and the port assignment in `emit`).
    const sameLane = horizontal ? from.x === to.x : from.y === to.y;
    const alongY = horizontal ? sameLane : !sameLane;

    let start: Point;
    let end: Point;
    let startDir: number;
    let endDir: number;
    if (alongY) {
      const down = to.y >= from.y;
      start = { x: ports?.start ?? from.x + from.w / 2, y: down ? from.y + from.h : from.y };
      end = { x: ports?.end ?? to.x + to.w / 2, y: down ? to.y : to.y + to.h };
      startDir = down ? 1 : 3;
      endDir = down ? 1 : 3;
    } else {
      const right = to.x >= from.x;
      start = { x: right ? from.x + from.w : from.x, y: ports?.start ?? from.y + from.h / 2 };
      end = { x: right ? to.x : to.x + to.w, y: ports?.end ?? to.y + to.h / 2 };
      startDir = right ? 0 : 2;
      endDir = right ? 0 : 2;
    }

    // Stubs step from the border past the clearance zone; A* runs between the stub ends.
    const stub = (point: Point, dir: number, out: boolean): Point => {
      const sign = out ? 1 : -1;
      return {
        x: point.x / STEP + DX[dir] * (CLEARANCE + 1) * sign,
        y: point.y / STEP + DY[dir] * (CLEARANCE + 1) * sign,
      };
    };
    const source = stub(start, startDir, true);
    const target = stub(end, endDir, false);

    type State = { x: number; y: number; dir: number; cost: number; estimate: number; prev?: State };
    const open: State[] = [
      {
        x: source.x,
        y: source.y,
        dir: startDir,
        cost: 0,
        estimate: Math.abs(target.x - source.x) + Math.abs(target.y - source.y),
      },
    ];
    const settled = new Map<string, number>();
    let found: State | undefined;

    // Bounded A*: the grid is small (canvas / STEP) and turns dominate, so the frontier stays
    // shallow; bail to the Z-router if the target is unreachable (fully fenced).
    for (let iterations = 0; open.length > 0 && iterations < 20_000; iterations++) {
      let bestIndex = 0;
      for (let index = 1; index < open.length; index++) {
        if (open[index].cost + open[index].estimate < open[bestIndex].cost + open[bestIndex].estimate) {
          bestIndex = index;
        }
      }
      const current = open.splice(bestIndex, 1)[0];
      if (current.x === target.x && current.y === target.y) {
        found = current;
        break;
      }
      const stateKey = `${current.x}:${current.y}:${current.dir}`;
      const seen = settled.get(stateKey);
      if (seen !== undefined && seen <= current.cost) {
        continue;
      }
      settled.set(stateKey, current.cost);

      for (let dir = 0; dir < 4; dir++) {
        if ((dir + 2) % 4 === current.dir) {
          continue;
        }
        const x = current.x + DX[dir];
        const y = current.y + DY[dir];
        if (x < bounds.x0 || x > bounds.x1 || y < bounds.y0 || y > bounds.y1 || blocked(x, y)) {
          continue;
        }
        const cost =
          current.cost +
          1 +
          (dir === current.dir ? 0 : TURN_COST) +
          (used.has(key(x, y)) ? USED_COST : 0) +
          // Entering the target off-axis forces one more bend at arrival; fold it in.
          (x === target.x && y === target.y && dir !== endDir ? TURN_COST : 0);
        open.push({
          x,
          y,
          dir,
          cost,
          estimate: Math.abs(target.x - x) + Math.abs(target.y - y),
          prev: current,
        });
      }
    }

    if (!found) {
      return fallback(edge);
    }

    // Reconstruct and collapse collinear points; usage is marked from the FINAL path below, so
    // the centering pass can distinguish foreign channels from this edge's own cells.
    const cells: Point[] = [];
    for (let state: State | undefined = found; state; state = state.prev) {
      cells.unshift({ x: state.x, y: state.y });
    }
    const points: Point[] = [start, ...cells.map((cell) => ({ x: cell.x * STEP, y: cell.y * STEP })), end];
    const simplified: Point[] = [points[0]];
    for (let index = 1; index < points.length - 1; index++) {
      const previous = simplified[simplified.length - 1];
      const next = points[index + 1];
      const point = points[index];
      const collinear =
        (previous.x === point.x && point.x === next.x) || (previous.y === point.y && point.y === next.y);
      if (!collinear) {
        simplified.push(point);
      }
    }
    simplified.push(points[points.length - 1]);

    // A single-jog Z centers its middle run equidistant from the two node borders — the A* path
    // is turn-minimal but expansion order lets it hug one node. Keep the shift only if the
    // adjusted segments avoid every obstacle AND every cell earlier edges already run through,
    // so parallel channels stay separated.
    const clearRun = (a: Point, b: Point): boolean => {
      const ax = Math.round(a.x / STEP);
      const ay = Math.round(a.y / STEP);
      const bx = Math.round(b.x / STEP);
      const by = Math.round(b.y / STEP);
      const steps = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
      const dx = Math.sign(bx - ax);
      const dy = Math.sign(by - ay);
      for (let step = 0; step <= steps; step++) {
        if (blocked(ax + dx * step, ay + dy * step) || used.has(key(ax + dx * step, ay + dy * step))) {
          return false;
        }
      }
      return true;
    };
    // Stub checks start past the terminal's own clearance zone, which is legitimately "blocked".
    const past = (from: Point, to: Point): Point => ({
      x: from.x + Math.sign(to.x - from.x) * (CLEARANCE + 1) * STEP,
      y: from.y + Math.sign(to.y - from.y) * (CLEARANCE + 1) * STEP,
    });
    if (simplified.length === 4) {
      const [p0, p1, p2, p3] = simplified;
      if (p1.y === p2.y && p0.y !== p3.y) {
        const mid = Math.round((p0.y + p3.y) / 2 / STEP) * STEP;
        const shifted = [
          { x: p1.x, y: mid },
          { x: p2.x, y: mid },
        ];
        if (
          clearRun(shifted[0], shifted[1]) &&
          clearRun(past(p0, shifted[0]), shifted[0]) &&
          clearRun(shifted[1], past(p3, shifted[1]))
        ) {
          simplified[1] = shifted[0];
          simplified[2] = shifted[1];
        }
      } else if (p1.x === p2.x && p0.x !== p3.x) {
        const mid = Math.round((p0.x + p3.x) / 2 / STEP) * STEP;
        const shifted = [
          { x: mid, y: p1.y },
          { x: mid, y: p2.y },
        ];
        if (
          clearRun(shifted[0], shifted[1]) &&
          clearRun(past(p0, shifted[0]), shifted[0]) &&
          clearRun(shifted[1], past(p3, shifted[1]))
        ) {
          simplified[1] = shifted[0];
          simplified[2] = shifted[1];
        }
      }
    }

    // Mark the final path's cells so later edges route (and center) around it.
    for (let index = 0; index < simplified.length - 1; index++) {
      const a = simplified[index];
      const b = simplified[index + 1];
      const ax = Math.round(a.x / STEP);
      const ay = Math.round(a.y / STEP);
      const steps = Math.max(Math.abs(Math.round(b.x / STEP) - ax), Math.abs(Math.round(b.y / STEP) - ay));
      const dx = Math.sign(b.x - a.x);
      const dy = Math.sign(b.y - a.y);
      for (let step = 0; step <= steps; step++) {
        used.add(key(ax + dx * step, ay + dy * step));
      }
    }
    return simplified;
  };
};

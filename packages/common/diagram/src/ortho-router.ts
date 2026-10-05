//
// Copyright 2026 DXOS.org
//

//
// Obstacle-avoiding orthogonal router: A* over a fine grid with a turn-dominant cost, so a
// connector never crosses a node and takes the fewest bends that avoidance allows (length breaks
// ties). A shared usage penalty nudges later edges off cells earlier edges already run through.
// Plugs into the dialects via the `Router` contract (`uml-grid.ts`).
//

import type * as Scene from './scene.ts';
import type { Rect, RoutedRelation, Router } from './uml-grid.ts';

/** Clearance kept between a route and any node border, in steps. */
const CLEARANCE = 1;
/** One bend costs as much as this many steps — turns dominate, distance breaks ties. */
const TURN_COST = 1000;
/** Traversing a cell another edge already used costs this many extra steps. */
const USED_COST = 24;
/** Margin around the diagram bounds the search may roam into, in steps. */
const MARGIN = 8;

type Point = Scene.Point;

/** Directions: right, down, left, up. */
const DX = [1, 0, -1, 0];
const DY = [0, 1, 0, -1];

/** Offsets past this distance turn the same way as at it, so the table clamps to it. */
const TURN_RADIUS = 4;
const TURN_SPAN = TURN_RADIUS * 2 + 1;

/**
 * Fewest turns from a cell heading `dir` to a target `(dx, dy)` away, entered heading `endDir` or
 * paying the search's one-turn penalty for entering off-axis — on an empty grid, so an admissible
 * and consistent lower bound for the search, indexed `[endDir][dir][dx][dy]`. It is exact where the
 * old estimate ignored the arrival heading, which sent every search sweeping the cells behind its
 * target. Computed once, by one backward search per arrival heading over the moves the search makes.
 */
const TURN_TABLE = (() => {
  const table = new Uint8Array(4 * 4 * TURN_SPAN * TURN_SPAN);
  // The board leaves room around the radius for the detours an off-axis approach takes.
  const board = TURN_RADIUS + 4;
  const side = board * 2 + 1;
  const stateOf = (x: number, y: number, dir: number) => ((y + board) * side + (x + board)) * 4 + dir;
  const turns = new Uint8Array(side * side * 4);
  // Label-correcting relaxation: steps cost 0, 1 or 2 turns, and a state re-enters the queue
  // whenever it improves, so the queue holds at most a few passes over a small board.
  const queue = new Int32Array(side * side * 4 * 8);
  for (let endDir = 0; endDir < 4; endDir++) {
    turns.fill(255);
    let head = 0;
    let tail = 0;
    // Arriving at the target ends the search whatever the heading.
    for (let dir = 0; dir < 4; dir++) {
      turns[stateOf(0, 0, dir)] = 0;
      queue[tail++] = stateOf(0, 0, dir);
    }
    while (head < tail) {
      const state = queue[head++ % queue.length];
      const arrivedDir = state % 4;
      const cell = (state - arrivedDir) / 4;
      const x = (cell % side) - board;
      const y = Math.floor(cell / side) - board;
      // Every state that steps into (x, y) heading `arrivedDir`, and what that step costs.
      const px = x - DX[arrivedDir];
      const py = y - DY[arrivedDir];
      if (Math.abs(px) > board || Math.abs(py) > board || (px === 0 && py === 0)) {
        continue;
      }
      const arrival = x === 0 && y === 0 && arrivedDir !== endDir ? 1 : 0;
      for (let dir = 0; dir < 4; dir++) {
        if ((arrivedDir + 2) % 4 === dir) {
          continue;
        }
        const previous = stateOf(px, py, dir);
        const total = turns[state] + (arrivedDir === dir ? 0 : 1) + arrival;
        if (total < turns[previous]) {
          turns[previous] = total;
          queue[tail++ % queue.length] = previous;
        }
      }
    }
    for (let dir = 0; dir < 4; dir++) {
      for (let dx = -TURN_RADIUS; dx <= TURN_RADIUS; dx++) {
        for (let dy = -TURN_RADIUS; dy <= TURN_RADIUS; dy++) {
          const at = ((endDir * 4 + dir) * TURN_SPAN + dx + TURN_RADIUS) * TURN_SPAN + dy + TURN_RADIUS;
          table[at] = dx === 0 && dy === 0 ? 0 : turns[stateOf(-dx, -dy, dir)];
        }
      }
    }
  }
  return table;
})();

const clampTurnOffset = (offset: number) => Math.max(-TURN_RADIUS, Math.min(TURN_RADIUS, offset));

const turnsBetween = (dx: number, dy: number, dir: number, endDir: number): number =>
  TURN_TABLE[
    ((endDir * 4 + dir) * TURN_SPAN + clampTurnOffset(dx) + TURN_RADIUS) * TURN_SPAN + clampTurnOffset(dy) + TURN_RADIUS
  ];

export type AvoidingRouterOptions = {
  /** Search-cell size (scene px): a fraction of the layout grid, so routes can hug node borders. */
  step: number;
};

/** Paths an avoiding router marked as used, so a later router can replay them; weak, so it holds nothing alive. */
const marked = new WeakSet<readonly Point[]>();

/** The avoiding router plus a way to replay an earlier route's footprint without searching again. */
export type AvoidingRouter = Router & {
  /**
   * Marks the cells of a path an avoiding router over the same obstacles returned before as used, as
   * routing it did; a path that marked nothing (a fallback route) marks nothing, so a replayed prefix
   * leaves the same state.
   */
  reserve: (points: readonly Point[]) => void;
};

/**
 * Creates a router that avoids the given node rects. Stateful across edges: earlier routes
 * penalize (not block) the cells they occupy, spreading parallel runs apart. `fallback` handles
 * the (fenced-in) edges the search cannot reach. The step is passed in rather than derived from
 * `uml-grid`'s `GRID`, which keeps this module free of a value import cycle with the dialects.
 */
export const makeAvoidingRouter = (
  obstacles: Rect[],
  fallback: Router,
  { step: STEP }: AvoidingRouterOptions,
): AvoidingRouter => {
  const xs = obstacles.flatMap((rect) => [rect.x, rect.x + rect.w]);
  const ys = obstacles.flatMap((rect) => [rect.y, rect.y + rect.h]);
  const bounds = {
    x0: Math.floor(Math.min(...xs) / STEP) - MARGIN,
    y0: Math.floor(Math.min(...ys) / STEP) - MARGIN,
    x1: Math.ceil(Math.max(...xs) / STEP) + MARGIN,
    y1: Math.ceil(Math.max(...ys) / STEP) + MARGIN,
  };
  // The grids carry a one-cell blocked border, so the search's blocked test also keeps it in bounds.
  const width = bounds.x1 - bounds.x0 + 3;
  const height = bounds.y1 - bounds.y0 + 3;
  const inBounds = (x: number, y: number) => x >= bounds.x0 && x <= bounds.x1 && y >= bounds.y0 && y <= bounds.y1;
  const cellIndex = (x: number, y: number) => (y - bounds.y0 + 1) * width + (x - bounds.x0 + 1);
  /** Cell offsets per direction, matching `DX` and `DY`. */
  const STEPS = [1, width, -1, -width];

  // Flat grids in place of per-cell string keys: the search touches every cell many times over and
  // the string building was half its running time.
  const blockedGrid = new Uint8Array(width * height);
  for (let x = 0; x < width; x++) {
    blockedGrid[x] = 1;
    blockedGrid[(height - 1) * width + x] = 1;
  }
  for (let y = 0; y < height; y++) {
    blockedGrid[y * width] = 1;
    blockedGrid[y * width + width - 1] = 1;
  }
  for (const rect of obstacles) {
    const x0 = Math.floor(rect.x / STEP) - CLEARANCE;
    const y0 = Math.floor(rect.y / STEP) - CLEARANCE;
    const x1 = Math.ceil((rect.x + rect.w) / STEP) + CLEARANCE;
    const y1 = Math.ceil((rect.y + rect.h) / STEP) + CLEARANCE;
    for (let y = Math.max(bounds.y0, y0 + 1); y < Math.min(bounds.y1 + 1, y1); y++) {
      for (let x = Math.max(bounds.x0, x0 + 1); x < Math.min(bounds.x1 + 1, x1); x++) {
        blockedGrid[cellIndex(x, y)] = 1;
      }
    }
  }
  const blocked = (x: number, y: number) => inBounds(x, y) && blockedGrid[cellIndex(x, y)] !== 0;
  const usedGrid = new Uint8Array(width * height);
  const isUsed = (x: number, y: number) => inBounds(x, y) && usedGrid[cellIndex(x, y)] !== 0;
  const markUsed = (x: number, y: number) => {
    if (inBounds(x, y)) {
      usedGrid[cellIndex(x, y)] = 1;
    }
  };
  // Settled costs per (cell, heading), reused across searches through a generation stamp so no
  // search pays to clear them.
  const settledCost = new Float64Array(width * height * 4);
  const settledGen = new Int32Array(width * height * 4);
  let generation = 0;

  type Terminal = { point: Point; dir: number };
  type Found = { cost: number; cells: Point[] };

  // Search states live in a pool of parallel typed arrays, addressed by slot, and the heap holds
  // slots: a search pushes millions of states, and one object per state made GC a third of the run.
  let capacity = 1 << 16;
  let stateKey = new Int32Array(capacity);
  let stateCost = new Float64Array(capacity);
  let statePrev = new Int32Array(capacity);
  let heap = new Int32Array(capacity);
  // Each heap entry's key beside its slot, so sifting compares without chasing the slot into the pool.
  let heapF = new Float64Array(capacity);
  let poolSize = 0;
  let heapSize = 0;

  const grow = () => {
    capacity *= 2;
    const widen = <T extends Int32Array | Float64Array>(array: T, make: (size: number) => T): T => {
      const next = make(capacity);
      next.set(array);
      return next;
    };
    stateKey = widen(stateKey, (size) => new Int32Array(size));
    stateCost = widen(stateCost, (size) => new Float64Array(size));
    statePrev = widen(statePrev, (size) => new Int32Array(size));
    heap = widen(heap, (size) => new Int32Array(size));
    heapF = widen(heapF, (size) => new Float64Array(size));
  };

  /** Binary min-heap on cost + estimate, so each pop is O(log n) instead of a frontier scan. */
  const heapPush = (key: number, cost: number, f: number, prev: number) => {
    if (poolSize === capacity) {
      grow();
    }
    const slot = poolSize++;
    stateKey[slot] = key;
    stateCost[slot] = cost;
    statePrev[slot] = prev;
    let index = heapSize++;
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (heapF[parent] <= f) {
        break;
      }
      heap[index] = heap[parent];
      heapF[index] = heapF[parent];
      index = parent;
    }
    heap[index] = slot;
    heapF[index] = f;
  };
  const heapPop = (): number => {
    const top = heap[0];
    const last = heap[--heapSize];
    if (heapSize > 0) {
      const lastF = heapF[heapSize];
      let index = 0;
      for (;;) {
        const left = index * 2 + 1;
        const right = left + 1;
        let smallest = index;
        let smallestF = lastF;
        if (left < heapSize && heapF[left] < smallestF) {
          smallest = left;
          smallestF = heapF[left];
        }
        if (right < heapSize && heapF[right] < smallestF) {
          smallest = right;
          smallestF = heapF[right];
        }
        if (smallest === index) {
          break;
        }
        heap[index] = heap[smallest];
        heapF[index] = smallestF;
        index = smallest;
      }
      heap[index] = last;
      heapF[index] = lastF;
    }
    return top;
  };

  const estimateFrom = (x: number, y: number, dir: number, target: Point, endDir: number): number => {
    const dx = target.x - x;
    const dy = target.y - y;
    return Math.abs(dx) + Math.abs(dy) + turnsBetween(dx, dy, dir, endDir) * TURN_COST;
  };

  // Every cell in every heading, so a reachable target is never abandoned on a large diagram.
  const budget = Math.max(50_000, (bounds.x1 - bounds.x0) * (bounds.y1 - bounds.y0) * 4);

  /**
   * Bounded A* between two stub ends (grid coordinates). Successors already dominated by a
   * settled state are pruned before pushing; undefined when the target is unreachable or no path
   * costs less than `bound`.
   */
  const search = (
    source: Point,
    startDir: number,
    target: Point,
    endDir: number,
    bound = Infinity,
  ): Found | undefined => {
    poolSize = 0;
    heapSize = 0;
    heapPush(
      cellIndex(source.x, source.y) * 4 + startDir,
      0,
      estimateFrom(source.x, source.y, startDir, target, endDir),
      -1,
    );
    generation++;
    const targetCell = inBounds(target.x, target.y) ? cellIndex(target.x, target.y) : -1;
    // Coordinates relative to the padded grid, so the estimate needs no conversion per state.
    const targetX = target.x - bounds.x0 + 1;
    const targetY = target.y - bounds.y0 + 1;
    let found = -1;

    for (let iterations = 0; heapSize > 0 && iterations < budget; iterations++) {
      // The estimate is admissible, so once the cheapest frontier key reaches the bound no path
      // can beat it; without this a losing configuration explores every state up to its own optimum.
      if (heapF[0] >= bound) {
        break;
      }
      const current = heapPop();
      const stateIndex = stateKey[current];
      const currentDir = stateIndex & 3;
      const currentCell = stateIndex >> 2;
      const currentCost = stateCost[current];
      if (currentCell === targetCell) {
        found = current;
        break;
      }
      if (settledGen[stateIndex] === generation && settledCost[stateIndex] <= currentCost) {
        continue;
      }
      settledGen[stateIndex] = generation;
      settledCost[stateIndex] = currentCost;
      const currentY = Math.floor(currentCell / width);
      const currentX = currentCell - currentY * width;

      for (let dir = 0; dir < 4; dir++) {
        if ((dir + 2) % 4 === currentDir) {
          continue;
        }
        const cell = currentCell + STEPS[dir];
        if (blockedGrid[cell] !== 0) {
          continue;
        }
        const cost =
          currentCost +
          1 +
          (dir === currentDir ? 0 : TURN_COST) +
          (usedGrid[cell] !== 0 ? USED_COST : 0) +
          // Entering the target off-axis forces one more bend at arrival; fold it in.
          (cell === targetCell && dir !== endDir ? TURN_COST : 0);
        const next = cell * 4 + dir;
        if (settledGen[next] === generation && settledCost[next] <= cost) {
          continue;
        }
        const dx = targetX - (currentX + DX[dir]);
        const dy = targetY - (currentY + DY[dir]);
        heapPush(
          next,
          cost,
          cost + (Math.abs(dx) + Math.abs(dy) + turnsBetween(dx, dy, dir, endDir) * TURN_COST),
          current,
        );
      }
    }

    if (found < 0) {
      return undefined;
    }
    const cells: Point[] = [];
    for (let slot = found; slot >= 0; slot = statePrev[slot]) {
      const cell = stateKey[slot] >> 2;
      cells.unshift({ x: (cell % width) + bounds.x0 - 1, y: Math.floor(cell / width) + bounds.y0 - 1 });
    }
    return { cost: stateCost[found], cells };
  };

  const markPath = (path: readonly Point[]) => {
    for (let index = 0; index < path.length - 1; index++) {
      const a = path[index];
      const b = path[index + 1];
      const ax = Math.round(a.x / STEP);
      const ay = Math.round(a.y / STEP);
      const steps = Math.max(Math.abs(Math.round(b.x / STEP) - ax), Math.abs(Math.round(b.y / STEP) - ay));
      const dx = Math.sign(b.x - a.x);
      const dy = Math.sign(b.y - a.y);
      for (let step = 0; step <= steps; step++) {
        markUsed(ax + dx * step, ay + dy * step);
      }
    }
  };
  const route = (edge: RoutedRelation): Point[] => {
    const { from, to, horizontal, ports } = edge;
    // Flow-axis faces mirror the Z-router (and the port assignment in `emit`).
    const sameLane = horizontal ? from.x === to.x : from.y === to.y;
    const alongY = horizontal ? sameLane : !sameLane;

    const down = to.y >= from.y;
    const right = to.x >= from.x;
    const flowStart: Terminal = alongY
      ? { point: { x: ports?.start ?? from.x + from.w / 2, y: down ? from.y + from.h : from.y }, dir: down ? 1 : 3 }
      : { point: { x: right ? from.x + from.w : from.x, y: ports?.start ?? from.y + from.h / 2 }, dir: right ? 0 : 2 };
    const flowEnd: Terminal = alongY
      ? { point: { x: ports?.end ?? to.x + to.w / 2, y: down ? to.y : to.y + to.h }, dir: down ? 1 : 3 }
      : { point: { x: right ? to.x : to.x + to.w, y: ports?.end ?? to.y + to.h / 2 }, dir: right ? 0 : 2 };
    // Cross-axis faces enable single-bend Ls when the displacement is diagonal — a fixed
    // flow-face pair forces a Z between laterally offset nodes.
    const crossStart: Terminal = alongY
      ? { point: { x: right ? from.x + from.w : from.x, y: from.y + from.h / 2 }, dir: right ? 0 : 2 }
      : { point: { x: from.x + from.w / 2, y: down ? from.y + from.h : from.y }, dir: down ? 1 : 3 };
    const crossEnd: Terminal = alongY
      ? { point: { x: right ? to.x : to.x + to.w, y: to.y + to.h / 2 }, dir: right ? 0 : 2 }
      : { point: { x: to.x + to.w / 2, y: down ? to.y : to.y + to.h }, dir: down ? 1 : 3 };

    const diagonal = alongY ? flowStart.point.x !== flowEnd.point.x : flowStart.point.y !== flowEnd.point.y;
    const configurations: [Terminal, Terminal][] = diagonal
      ? [
          [flowStart, flowEnd],
          [crossStart, flowEnd],
          [flowStart, crossEnd],
        ]
      : [[flowStart, flowEnd]];

    // Stubs step from the border past the clearance zone; A* runs between the stub ends.
    // Rounded to whole cells: ports may sit on exact fractional coordinates (collision fallback),
    // and a fractional goal cell would never match — the visible sub-cell offset lives in the
    // first/last segment.
    const stub = (point: Point, dir: number, out: boolean): Point => {
      const sign = out ? 1 : -1;
      return {
        x: Math.round(point.x / STEP) + DX[dir] * (CLEARANCE + 1) * sign,
        y: Math.round(point.y / STEP) + DY[dir] * (CLEARANCE + 1) * sign,
      };
    };

    let start: Point | undefined;
    let end: Point | undefined;
    let best: Found | undefined;
    for (const [startTerminal, endTerminal] of configurations) {
      const result = search(
        stub(startTerminal.point, startTerminal.dir, true),
        startTerminal.dir,
        stub(endTerminal.point, endTerminal.dir, false),
        endTerminal.dir,
        best?.cost,
      );
      if (result && (!best || result.cost < best.cost)) {
        best = result;
        start = startTerminal.point;
        end = endTerminal.point;
      }
    }
    if (!best || !start || !end) {
      return fallback(edge);
    }

    // Reconstruct and collapse collinear points; usage is marked from the FINAL path below, so
    // the centering pass can distinguish foreign channels from this edge's own cells.
    const points: Point[] = [start, ...best.cells.map((cell) => ({ x: cell.x * STEP, y: cell.y * STEP })), end];
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
        if (blocked(ax + dx * step, ay + dy * step) || isUsed(ax + dx * step, ay + dy * step)) {
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
    markPath(simplified);
    marked.add(simplified);
    return simplified;
  };

  const reserve = (points: readonly Point[]) => {
    if (marked.has(points)) {
      markPath(points);
    }
  };
  return Object.assign(route, { reserve });
};

//
// Copyright 2026 DXOS.org
//

import { type Timer, timer } from 'd3';

import { type Graph } from '@dxos/graph';
import { log } from '@dxos/log';

import { type GraphLayoutNode } from '../types';
import { type GraphProjectorOptions, GraphProjector } from './graph-projector';

// Boids swarming simulation rendered through the react-ui-graph SVG renderer.
// Mirrors the canvas Swarm component's tick (alignment / cohesion / separation)
// but mutates `x/y` on `GraphLayoutNode` instances directly and emits 'positions'
// each frame so `GraphRenderer.applyPositions` can fast-path SVG transforms,
// exactly like `GraphForceProjector`.
//
// https://en.wikipedia.org/wiki/Boids

const SWARMMATE_RADIUS = 60;
const SEPARATION_DISTANCE = 30;

/** Per-frame state stored on a layout node by the projector. */
export type SwarmNode = GraphLayoutNode & {
  vx?: number;
  vy?: number;
  ax?: number;
  ay?: number;
  /**
   * Shallow ring buffer of recent absolute positions (oldest first). One position is
   * pushed per tick BEFORE integration, so after a tick the most recent entry is the
   * pre-tick position. Cleared whenever the boid wraps a viewBox edge so the trail
   * doesn't streak across the canvas.
   */
  history?: Array<{ x: number; y: number }>;
};

export type GraphSwarmProjectorOptions = GraphProjectorOptions & {
  /** Initial spread (px) of new boids around the origin. */
  spawnRadius?: number;
  /** Hard cap on per-tick velocity. */
  maxVelocity?: number;
  /** Per-force weights — match Swarm's normalisation (divided by 100 on apply). */
  alignment?: number;
  cohesion?: number;
  separation?: number;
  /** Pixel radius (in SVG model coords) of the invisible repel zone tracking the pointer. 0 disables. */
  cursorRepel?: number;
  /** Avoidance force weight (divided by 10 on apply, matching canvas Swarm). */
  avoidance?: number;
  /**
   * Number of previous positions retained per boid (one per simulation tick). The visible
   * tail spans roughly `trailLength * maxVelocity` pixels — at 60 fps a value of 30 is
   * about a half-second streak. Dense per-tick sampling avoids the "snap" artifact a
   * coarser sample interval introduces when only the head moves between samples.
   */
  trailLength?: number;
};

const DEFAULTS: Required<
  Pick<
    GraphSwarmProjectorOptions,
    | 'spawnRadius'
    | 'maxVelocity'
    | 'alignment'
    | 'cohesion'
    | 'separation'
    | 'cursorRepel'
    | 'avoidance'
    | 'trailLength'
  >
> = {
  spawnRadius: 200,
  maxVelocity: 1.2,
  alignment: 3,
  cohesion: 3,
  separation: 3,
  cursorRepel: 120,
  avoidance: 3,
  trailLength: 30,
};

/**
 * Boids projector. One simulation timer (d3 `timer`) drives the tick; nodes are
 * the boids, with `vx/vy/ax/ay` carried alongside `x/y`. Edges are kept in the
 * layout so the renderer still draws them between connected boids, but they do
 * NOT exert a link force — boid motion is governed purely by alignment, cohesion
 * and separation, with viewBox-wrap at the SVG bounds.
 */
export class GraphSwarmProjector<NodeData = any> extends GraphProjector<NodeData, GraphSwarmProjectorOptions> {
  #timer?: Timer;
  /** Cursor in SVG model coordinates, or null when the pointer is outside the surface. */
  #cursor: { x: number; y: number } | null = null;

  override findNode(): GraphLayoutNode<NodeData> | undefined {
    // Boids have no spatial index — drag isn't supported in this variant.
    return undefined;
  }

  /**
   * Tell the projector where the pointer is, in SVG model coordinates (the same space
   * `node.x/y` live in — center origin, post-zoom). Pass `null` (or omit args) on
   * pointer-leave to disable cursor avoidance.
   */
  setCursor(x?: number | null, y?: number | null): void {
    if (x == null || y == null) {
      this.#cursor = null;
    } else {
      this.#cursor = { x, y };
    }
  }

  protected override onUpdate(graph?: Graph.Any): void {
    log('onUpdate', { graph: { nodes: graph?.nodes.length, edges: graph?.edges.length } });
    this.mergeData(graph);
    this.initializeNodes();
    // Bind enter/exit once before motion starts; subsequent ticks emit 'positions'.
    this.emitUpdate('topology');
  }

  protected override async onStart(): Promise<void> {
    this.startTimer();
  }

  protected override async onStop(): Promise<void> {
    this.stopTimer();
  }

  protected override onRefresh(): void {
    if (!this.#timer) {
      this.startTimer();
    }
  }

  #opt<K extends keyof typeof DEFAULTS>(key: K): number {
    return (this.options[key] as number | undefined) ?? DEFAULTS[key];
  }

  private initializeNodes(): void {
    const spawnRadius = this.#opt('spawnRadius');
    const maxVelocity = this.#opt('maxVelocity');
    for (const node of this.layout.graph.nodes as SwarmNode[]) {
      if (!node.initialized) {
        const theta = Math.random() * 2 * Math.PI;
        const r = Math.random() * spawnRadius;
        node.x = Math.cos(theta) * r;
        node.y = Math.sin(theta) * r;
        // Random initial velocity bounded by maxVelocity.
        const phi = Math.random() * 2 * Math.PI;
        const speed = (0.3 + Math.random() * 0.7) * maxVelocity;
        node.vx = Math.cos(phi) * speed;
        node.vy = Math.sin(phi) * speed;
        node.ax = 0;
        node.ay = 0;
        node.initialized = true;
      } else {
        // Make sure velocity / acceleration exist on nodes inherited from a prior layout.
        node.vx ??= 0;
        node.vy ??= 0;
        node.ax ??= 0;
        node.ay ??= 0;
      }
      // Default render radius — matches the force projector default.
      node.r ??= 6;
      // Reset the trail history. On fresh entry (`prev` from force/lattice/...) the field
      // is undefined; on re-entry from a prior swarm session the layout node is reused and
      // still carries stale absolute positions which would draw the tail back to wherever
      // the boid was last time. Seed with the current position so the tail grows from the
      // boid's actual starting point.
      node.history = [{ x: node.x ?? 0, y: node.y ?? 0 }];
    }
  }

  private startTimer(): void {
    this.stopTimer();
    this.#timer = timer(() => this.tick());
  }

  private stopTimer(): void {
    this.#timer?.stop();
    this.#timer = undefined;
  }

  /**
   * One simulation step. Modeled on `tick` in Swarm.tsx, but operating in the
   * SVG centered-origin coordinate space and writing to `node.x/y` directly so
   * the existing `GraphRenderer.applyPositions` reads them unchanged.
   */
  private tick(): void {
    const size = this.context.size;
    if (!size) {
      return;
    }
    const { width, height } = size;
    // SVG.Root with `centered: true` (the default) uses a viewBox where origin is
    // the center and bounds are [-w/2, w/2] x [-h/2, h/2].
    const halfW = width / 2;
    const halfH = height / 2;

    const nodes = this.layout.graph.nodes as SwarmNode[];
    const maxVelocity = this.#opt('maxVelocity');
    // Match Swarm's force normalisation so weight semantics line up across variants.
    const alignmentW = this.#opt('alignment') / 100;
    const cohesionW = this.#opt('cohesion') / 100;
    const separationW = this.#opt('separation') / 100;
    const avoidanceW = this.#opt('avoidance') / 10;
    const cursorRepel = this.#opt('cursorRepel');
    const cursor = cursorRepel > 0 ? this.#cursor : null;

    // Two-pass per tick: (1) compute acceleration from neighbours, (2) integrate.
    for (const b1 of nodes) {
      let ax = 0;
      let ay = 0;
      let alignX = 0;
      let alignY = 0;
      let alignActive = false;
      let cohX = 0;
      let cohY = 0;
      let cohActive = false;
      let sepX = 0;
      let sepY = 0;
      let sepActive = false;
      let avoidX = 0;
      let avoidY = 0;
      let avoidActive = false;

      // Cursor repulsion: when the cursor is within the repel zone, push the boid
      // directly away. Mirrors the canvas Swarm's `repel` (treats the cursor as a
      // SwarmObstacle with radius = cursorRepel).
      if (cursor) {
        const dx = cursor.x - (b1.x ?? 0);
        const dy = cursor.y - (b1.y ?? 0);
        const distSq = dx * dx + dy * dy;
        if (distSq > 0 && distSq < cursorRepel * cursorRepel) {
          const dist = Math.sqrt(distSq);
          // Inverse-distance push, matching the canvas variant's `diff.scaleTo(-1 / distance)`.
          avoidX = (-dx / dist) * (1 / dist);
          avoidY = (-dy / dist) * (1 / dist);
          avoidActive = true;
        }
      }

      // Mirror the canvas variant: while a boid is being avoided, ignore swarmmate
      // forces so it commits fully to escaping the cursor.
      if (!avoidActive) {
        for (const b2 of nodes) {
          if (b1 === b2) {
            continue;
          }

          const dx = (b2.x ?? 0) - (b1.x ?? 0);
          const dy = (b2.y ?? 0) - (b1.y ?? 0);
          const distSq = dx * dx + dy * dy;
          if (distSq === 0) {
            continue;
          }
          const dist = Math.sqrt(distSq);

          if (dist < SEPARATION_DISTANCE) {
            // Push away — inverse-distance weighting matches the canvas variant.
            sepX += (-dx / dist) * (1 / dist);
            sepY += (-dy / dist) * (1 / dist);
            sepActive = true;
          }
          if (dist < SWARMMATE_RADIUS) {
            cohX += dx;
            cohY += dy;
            cohActive = true;
            alignX += b2.vx ?? 0;
            alignY += b2.vy ?? 0;
            alignActive = true;
          }
        }
      }

      const applyForce = (fx: number, fy: number, weight: number, active: boolean): void => {
        if (!active || weight === 0) {
          return;
        }
        // Steer = target_velocity - current_velocity, then truncate to weight.
        const len = Math.sqrt(fx * fx + fy * fy);
        if (len === 0) {
          return;
        }
        const sx = (fx * maxVelocity) / len - (b1.vx ?? 0);
        const sy = (fy * maxVelocity) / len - (b1.vy ?? 0);
        const slen = Math.sqrt(sx * sx + sy * sy);
        if (slen > weight) {
          ax += (sx * weight) / slen;
          ay += (sy * weight) / slen;
        } else {
          ax += sx;
          ay += sy;
        }
      };

      applyForce(alignX, alignY, alignmentW, alignActive);
      applyForce(cohX, cohY, cohesionW, cohActive);
      applyForce(sepX, sepY, separationW, sepActive);
      applyForce(avoidX, avoidY, avoidanceW, avoidActive);

      b1.ax = ax;
      b1.ay = ay;
    }

    // Integrate + viewBox-wrap + trail bookkeeping.
    const trailLength = Math.max(0, Math.round(this.#opt('trailLength')));
    for (const b of nodes) {
      let vx = (b.vx ?? 0) + (b.ax ?? 0);
      let vy = (b.vy ?? 0) + (b.ay ?? 0);
      const vlen = Math.sqrt(vx * vx + vy * vy);
      if (vlen > maxVelocity) {
        vx = (vx * maxVelocity) / vlen;
        vy = (vy * maxVelocity) / vlen;
      }
      b.vx = vx;
      b.vy = vy;

      // Push the pre-integration position into history every tick. Dense sampling means
      // the path-end shifts by a sub-pixel amount per frame — the curve evolves
      // continuously and the tail-end gradient stop tracks smoothly, avoiding the snap
      // / flicker a sparser sample interval would introduce.
      if (trailLength > 0) {
        const history = b.history ?? (b.history = []);
        history.push({ x: b.x ?? 0, y: b.y ?? 0 });
        if (history.length > trailLength) {
          history.splice(0, history.length - trailLength);
        }
      }

      let x = (b.x ?? 0) + vx;
      let y = (b.y ?? 0) + vy;
      // Wrap at the centered viewBox edges so boids leaving one side reappear on the opposite.
      // On wrap we clear the trail so the line doesn't streak across the canvas (matches
      // the canvas Swarm's wrap-aware trail rendering, but simpler).
      let wrapped = false;
      if (x > halfW) {
        x -= width;
        wrapped = true;
      } else if (x < -halfW) {
        x += width;
        wrapped = true;
      }
      if (y > halfH) {
        y -= height;
        wrapped = true;
      } else if (y < -halfH) {
        y += height;
        wrapped = true;
      }
      if (wrapped && b.history) {
        b.history.length = 0;
      }
      b.x = x;
      b.y = y;
    }

    // Edge geometry: quadratic Bézier with control at the origin so every edge bends
    // toward the center — visually echoing the bundle projector's centre-routed
    // curves while staying cheap to compute. The renderer's `applyPositions` reads
    // `edge.path` directly when present.
    for (const edge of this.layout.graph.edges) {
      const sx = edge.source.x ?? 0;
      const sy = edge.source.y ?? 0;
      const tx = edge.target.x ?? 0;
      const ty = edge.target.y ?? 0;
      edge.path = `M ${sx} ${sy} Q 0 0 ${tx} ${ty}`;
    }

    this.emitUpdate('positions');
  }
}

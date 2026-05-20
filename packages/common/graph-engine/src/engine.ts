//
// Copyright 2026 DXOS.org
//

import { type Graph, type GraphModel } from '@dxos/graph';

import { type RenderBackend } from './backend/render-backend';
import { type DrawContext } from './draw/draw-context';
import { EventEmitter } from './event-emitter';
import { subscribeModel } from './model/model-adapter';
import { type Projector } from './projector/projector';
import { type EdgeHandler, type EngineHandle, type NodeHandler } from './registry/handlers';
import { type TypeRegistry } from './registry/type-registry';
import { type EdgeRouter } from './router/router';
import { StraightRouter } from './router/straight-router';
import { type EntityHit, type Tool } from './tool/tool';
import { TweenService } from './tween/tween-service';
import { type LayoutEdge, type LayoutGraph, type LayoutNode } from './types';
import { Viewport } from './viewport';

export type EngineOptions<N extends Graph.Node.Any, E extends Graph.Edge.Any> = {
  model: GraphModel.ReactiveGraphModel<N, E>;
  registry: TypeRegistry;
  projector: Projector;
  backend?: RenderBackend;
  tools?: Tool[];
};

/**
 * Top-level engine — owns model subscription, projector, tween, tools, viewport, backend.
 */
export class Engine<N extends Graph.Node.Any = any, E extends Graph.Edge.Any = any> implements EngineHandle {
  readonly model: GraphModel.ReactiveGraphModel<N, E>;
  readonly registry: TypeRegistry;
  readonly projector: Projector;
  readonly viewport = new Viewport();
  readonly tween = new TweenService();
  readonly frame = new EventEmitter<{ t: number }>();

  #backend?: RenderBackend;
  #tools: Tool[];
  #detachTools: Array<() => void> = [];
  #unsubscribeModel?: () => void;
  #rafHandle?: number;
  #routers = new Map<string, EdgeRouter>([['straight', new StraightRouter()]]);
  #frontIslands = new Set<string>();
  #started = false;

  constructor(opts: EngineOptions<N, E>) {
    this.model = opts.model;
    this.registry = opts.registry;
    this.projector = opts.projector;
    this.#backend = opts.backend;
    this.#tools = opts.tools ?? [];
  }

  get layout(): LayoutGraph {
    return this.projector.layout;
  }

  setBackend(backend: RenderBackend | undefined) {
    this.#backend = backend;
  }

  attachTools(target: EventTarget) {
    for (const tool of this.#tools) {
      this.#detachTools.push(tool.attach(this, target));
    }
  }

  detachTools() {
    for (const d of this.#detachTools) {
      d();
    }
    this.#detachTools = [];
  }

  start() {
    if (this.#started) {
      return;
    }
    this.#started = true;
    this.#unsubscribeModel = subscribeModel(this.model, (g) => this.projector.updateData(g));
    this.projector.start();
    this.#loop(performance.now());
  }

  stop() {
    this.#started = false;
    if (this.#rafHandle !== undefined && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.#rafHandle);
    }
    this.#unsubscribeModel?.();
    this.projector.stop();
  }

  hitTestWorld(wx: number, wy: number): EntityHit {
    for (let i = this.layout.nodes.length - 1; i >= 0; i--) {
      const node = this.layout.nodes[i];
      const handler = this.registry.resolveNode(node as N);
      if (handler.hit([wx, wy], node)) {
        return { kind: 'node', node: node as LayoutNode };
      }
    }
    for (let i = this.layout.edges.length - 1; i >= 0; i--) {
      const edge = this.layout.edges[i];
      const handler = this.registry.resolveEdge(edge as unknown as E);
      const path = this.#routeEdge(edge, handler);
      if (handler.hit([wx, wy], edge, path)) {
        return { kind: 'edge', edge: edge as LayoutEdge };
      }
    }
    return undefined;
  }

  hitTest(screenX: number, screenY: number): EntityHit {
    const [wx, wy] = this.viewport.screenToWorld([screenX, screenY]);
    return this.hitTestWorld(wx, wy);
  }

  emitFrame() {
    this.frame.emit({ t: performance.now() });
  }

  bringToFront(islandId: string) {
    this.#frontIslands.add(islandId);
  }

  routeEdge(edge: LayoutEdge) {
    const handler = this.registry.resolveEdge(edge as unknown as E);
    return this.#routeEdge(edge, handler);
  }

  #routeEdge(edge: LayoutEdge, handler: EdgeHandler) {
    const router =
      typeof handler.router === 'string' ? (this.#routers.get(handler.router) ?? new StraightRouter()) : handler.router;
    return router.route(edge);
  }

  #loop(t: number) {
    if (!this.#started) {
      return;
    }
    this.projector.tick(t);
    this.tween.advance(t);
    this.viewport.tick(t);

    if (this.#backend) {
      const ctx = this.#backend.begin();
      try {
        this.#renderLayers(ctx);
      } finally {
        // Always call end() so backends can flush/swap even if a handler throws.
        this.#backend.end();
      }
    }

    this.frame.emit({ t });

    if (typeof requestAnimationFrame !== 'undefined') {
      this.#rafHandle = requestAnimationFrame((next) => this.#loop(next));
    }
  }

  #renderLayers(ctx: DrawContext) {
    // Apply viewport transform — world coords pass through draw handlers; the backend's
    // already-applied DPR scale is preserved by save/restore.
    const { x, y, k } = this.viewport.transform;
    ctx.save();
    ctx.transform(k, 0, 0, k, x, y);
    for (const edge of this.layout.edges) {
      const handler = this.registry.resolveEdge(edge as unknown as E);
      const path = this.#routeEdge(edge, handler);
      handler.draw(ctx, edge, path, this.viewport);
    }
    for (const node of this.layout.nodes) {
      const handler = this.registry.resolveNode(node as N) as NodeHandler;
      handler.draw(ctx, node, this.viewport);
    }
    ctx.restore();
  }
}

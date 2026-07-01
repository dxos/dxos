//
// Copyright 2026 DXOS.org
//

import { createPath } from '../draw/path';
import { type EdgeHandler, type NodeHandler } from './handlers';

const DEFAULT_RADIUS = 8;

export const defaultNodeHandler: NodeHandler = {
  draw(ctx, node) {
    const r = node.r ?? DEFAULT_RADIUS;
    const x = node.x ?? 0;
    const y = node.y ?? 0;
    const p = createPath();
    p.arc(x, y, r, 0, Math.PI * 2);
    p.close();
    ctx.setFill('#888');
    ctx.fill(p);
  },
  bounds(node) {
    const r = node.r ?? DEFAULT_RADIUS;
    const x = node.x ?? 0;
    const y = node.y ?? 0;
    return { x: x - r, y: y - r, width: r * 2, height: r * 2 };
  },
  hit([px, py], node) {
    const r = node.r ?? DEFAULT_RADIUS;
    const dx = (node.x ?? 0) - px;
    const dy = (node.y ?? 0) - py;
    return dx * dx + dy * dy <= r * r;
  },
  capabilities: { hoverable: true, selectable: true },
};

export const defaultEdgeHandler: EdgeHandler = {
  router: 'straight',
  draw(ctx, _edge, path) {
    ctx.setStroke('#aaa');
    ctx.setLineWidth(1);
    ctx.stroke(path);
  },
  hit() {
    // Phase 1: edge hit-testing deferred (linker tool not yet shipped).
    return false;
  },
  bounds(edge) {
    const { source, target } = edge;
    const x = Math.min(source.x ?? 0, target.x ?? 0);
    const y = Math.min(source.y ?? 0, target.y ?? 0);
    const width = Math.abs((target.x ?? 0) - (source.x ?? 0));
    const height = Math.abs((target.y ?? 0) - (source.y ?? 0));
    return { x, y, width, height };
  },
};

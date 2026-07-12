//
// Copyright 2026 DXOS.org
//

import { type Path, createPath } from '../draw/path';
import { type LayoutEdge, type Point } from '../types';
import { type EdgeRouter } from './router';

export class StraightRouter<NodeData = any, EdgeData = any> implements EdgeRouter<NodeData, EdgeData> {
  route(edge: LayoutEdge<NodeData, EdgeData>): Path {
    const sx = edge.source.x ?? 0;
    const sy = edge.source.y ?? 0;
    const tx = edge.target.x ?? 0;
    const ty = edge.target.y ?? 0;
    const dx = tx - sx;
    const dy = ty - sy;
    const len = Math.hypot(dx, dy) || 1;
    const sr = edge.source.r ?? 0;
    const tr = edge.target.r ?? 0;
    const ux = dx / len;
    const uy = dy / len;
    const start: Point = [sx + ux * sr, sy + uy * sr];
    const end: Point = [tx - ux * tr, ty - uy * tr];
    const p = createPath();
    p.moveTo(start[0], start[1]);
    p.lineTo(end[0], end[1]);
    return p;
  }

  labelPoint(t: number, path: Path): Point {
    const m = path.commands.find((c) => c.type === 'M');
    const l = path.commands.find((c) => c.type === 'L');
    if (!m || !l || m.type !== 'M' || l.type !== 'L') {
      return [0, 0];
    }
    return [m.x + (l.x - m.x) * t, m.y + (l.y - m.y) * t];
  }
}

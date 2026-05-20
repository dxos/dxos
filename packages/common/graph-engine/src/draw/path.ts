//
// Copyright 2026 DXOS.org
//

export type PathCommand =
  | { type: 'M'; x: number; y: number }
  | { type: 'L'; x: number; y: number }
  | { type: 'C'; cx1: number; cy1: number; cx2: number; cy2: number; x: number; y: number }
  | { type: 'A'; cx: number; cy: number; r: number; a0: number; a1: number; ccw?: boolean }
  | { type: 'Z' };

/**
 * Backend-neutral path. Records commands; backends consume to produce SVG `d` or `Path2D`.
 */
export interface Path {
  readonly commands: readonly PathCommand[];
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  bezierCurveTo(cx1: number, cy1: number, cx2: number, cy2: number, x: number, y: number): void;
  arc(cx: number, cy: number, r: number, a0: number, a1: number, ccw?: boolean): void;
  close(): void;
  toSvg(): string;
}

export const createPath = (): Path => {
  const commands: PathCommand[] = [];
  return {
    get commands() {
      return commands;
    },
    moveTo(x, y) {
      commands.push({ type: 'M', x, y });
    },
    lineTo(x, y) {
      commands.push({ type: 'L', x, y });
    },
    bezierCurveTo(cx1, cy1, cx2, cy2, x, y) {
      commands.push({ type: 'C', cx1, cy1, cx2, cy2, x, y });
    },
    arc(cx, cy, r, a0, a1, ccw) {
      commands.push({ type: 'A', cx, cy, r, a0, a1, ccw });
    },
    close() {
      commands.push({ type: 'Z' });
    },
    toSvg() {
      return commands
        .map((c) => {
          switch (c.type) {
            case 'M':
              return `M${c.x} ${c.y}`;
            case 'L':
              return `L${c.x} ${c.y}`;
            case 'C':
              return `C${c.cx1} ${c.cy1} ${c.cx2} ${c.cy2} ${c.x} ${c.y}`;
            case 'A': {
              // Canvas arc(cx,cy,r,a0,a1,ccw) → SVG `A`. Compute large-arc-flag from the
              // signed sweep so arcs > 180° serialize correctly. sweep-flag mirrors Canvas
              // direction: clockwise → 1, counterclockwise → 0.
              const endX = c.cx + Math.cos(c.a1) * c.r;
              const endY = c.cy + Math.sin(c.a1) * c.r;
              const twoPi = Math.PI * 2;
              const rawDelta = c.a1 - c.a0;
              const normalizedDelta = c.ccw
                ? ((rawDelta % twoPi) - twoPi) % twoPi // negative in (-2π, 0]
                : ((rawDelta % twoPi) + twoPi) % twoPi; // positive in [0, 2π)
              const largeArc = Math.abs(normalizedDelta) > Math.PI ? 1 : 0;
              const sweep = c.ccw ? 0 : 1;
              return `A${c.r} ${c.r} 0 ${largeArc} ${sweep} ${endX} ${endY}`;
            }
            case 'Z':
              return 'Z';
          }
        })
        .join(' ');
    },
  };
};

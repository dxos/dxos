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
            case 'A':
              return `A${c.r} ${c.r} 0 0 ${c.ccw ? 0 : 1} ${c.cx + Math.cos(c.a1) * c.r} ${c.cy + Math.sin(c.a1) * c.r}`;
            case 'Z':
              return 'Z';
          }
        })
        .join(' ');
    },
  };
};

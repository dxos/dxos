//
// Copyright 2026 DXOS.org
//

import { type DrawContext } from '../../draw/draw-context';
import { type Path } from '../../draw/path';

export class CanvasDrawContext implements DrawContext {
  #ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.#ctx = ctx;
  }

  save() {
    this.#ctx.save();
  }

  restore() {
    this.#ctx.restore();
  }

  transform(a: number, b: number, c: number, d: number, e: number, f: number) {
    this.#ctx.transform(a, b, c, d, e, f);
  }

  setFill(style: string) {
    this.#ctx.fillStyle = style;
  }

  setStroke(style: string) {
    this.#ctx.strokeStyle = style;
  }

  setLineWidth(width: number) {
    this.#ctx.lineWidth = width;
  }

  setFont(font: string) {
    this.#ctx.font = font;
  }

  fill(path: Path) {
    this.#trace(path);
    this.#ctx.fill();
  }

  stroke(path: Path) {
    this.#trace(path);
    this.#ctx.stroke();
  }

  text(
    content: string,
    x: number,
    y: number,
    opts?: { align?: 'left' | 'center' | 'right'; baseline?: 'top' | 'middle' | 'bottom' },
  ) {
    // textAlign/textBaseline persist on the context; wrap so per-call options don't leak to siblings.
    this.#ctx.save();
    if (opts?.align) {
      this.#ctx.textAlign = opts.align;
    }
    if (opts?.baseline) {
      this.#ctx.textBaseline = opts.baseline;
    }
    this.#ctx.fillText(content, x, y);
    this.#ctx.restore();
  }

  #trace(path: Path) {
    this.#ctx.beginPath();
    for (const c of path.commands) {
      switch (c.type) {
        case 'M':
          this.#ctx.moveTo(c.x, c.y);
          break;
        case 'L':
          this.#ctx.lineTo(c.x, c.y);
          break;
        case 'C':
          this.#ctx.bezierCurveTo(c.cx1, c.cy1, c.cx2, c.cy2, c.x, c.y);
          break;
        case 'A':
          this.#ctx.arc(c.cx, c.cy, c.r, c.a0, c.a1, c.ccw);
          break;
        case 'Z':
          this.#ctx.closePath();
          break;
      }
    }
  }
}

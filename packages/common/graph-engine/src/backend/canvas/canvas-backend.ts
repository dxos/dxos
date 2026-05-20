//
// Copyright 2026 DXOS.org
//

import { invariant } from '@dxos/invariant';

import { type RenderBackend } from '../render-backend';
import { CanvasDrawContext } from './canvas-draw-context';

/**
 * Drives a <canvas> element. Handles HiDPI scaling.
 */
export class CanvasBackend implements RenderBackend {
  #canvas: HTMLCanvasElement;
  #ctx: CanvasRenderingContext2D;
  #drawContext: CanvasDrawContext;
  #dpr = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.#canvas = canvas;
    const ctx = canvas.getContext('2d');
    invariant(ctx, 'Canvas 2D context unavailable');
    this.#ctx = ctx;
    this.#drawContext = new CanvasDrawContext(ctx);
  }

  resize(width: number, height: number, dpr: number) {
    this.#dpr = dpr;
    this.#canvas.width = Math.floor(width * dpr);
    this.#canvas.height = Math.floor(height * dpr);
    this.#canvas.style.width = `${width}px`;
    this.#canvas.style.height = `${height}px`;
  }

  begin() {
    const { width, height } = this.#canvas;
    this.#ctx.setTransform(this.#dpr, 0, 0, this.#dpr, 0, 0);
    this.#ctx.clearRect(0, 0, width, height);
    return this.#drawContext;
  }

  end() {
    // No-op for 2D context — pixels are committed.
  }
}

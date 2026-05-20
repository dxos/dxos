//
// Copyright 2026 DXOS.org
//

import { type ZoomBehavior, select, zoom, zoomIdentity } from 'd3';

import { type Viewport } from '../viewport';
import { type Tool, type ToolHost } from './tool';

export type ZoomToolOptions = {
  extent?: [number, number];
  /**
   * When true, the world origin (0, 0) is centered in the surface on the first non-zero resize.
   * Default: true.
   */
  centerOrigin?: boolean;
};

export class ZoomTool implements Tool {
  readonly id = 'zoom';
  #viewport: Viewport;
  #options: ZoomToolOptions;
  #zoom?: ZoomBehavior<Element, unknown>;
  #target?: Element;
  #centered = false;

  constructor(viewport: Viewport, options: ZoomToolOptions = {}) {
    this.#viewport = viewport;
    this.#options = options;
  }

  attach(_host: ToolHost, target: EventTarget): () => void {
    const el = target as Element;
    this.#target = el;
    this.#zoom = zoom<Element, unknown>()
      .scaleExtent(this.#options.extent ?? [0.25, 4])
      .on('zoom', (event) => this.#viewport.setTransform(event.transform));
    select(el).call(this.#zoom as any);

    // Center the world origin on first non-zero resize.
    const centerOrigin = this.#options.centerOrigin ?? true;
    const tryCenter = (width: number, height: number) => {
      if (!centerOrigin || this.#centered || !width || !height || !this.#zoom) {
        return;
      }
      this.#centered = true;
      const t = zoomIdentity.translate(width / 2, height / 2);
      select(el).call((this.#zoom as any).transform, t);
    };
    tryCenter(this.#viewport.size.width, this.#viewport.size.height);
    const offResize = this.#viewport.resized.on((s) => tryCenter(s.width, s.height));

    return () => {
      offResize();
      select(el).on('.zoom', null);
      this.#target = undefined;
      this.#centered = false;
    };
  }
}

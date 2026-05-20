//
// Copyright 2026 DXOS.org
//

import { type ZoomBehavior, select, zoom } from 'd3';

import { type Viewport } from '../viewport';
import { type Tool, type ToolHost } from './tool';

export type ZoomToolOptions = {
  extent?: [number, number];
};

export class ZoomTool implements Tool {
  readonly id = 'zoom';
  #viewport: Viewport;
  #options: ZoomToolOptions;
  #zoom?: ZoomBehavior<Element, unknown>;

  constructor(viewport: Viewport, options: ZoomToolOptions = {}) {
    this.#viewport = viewport;
    this.#options = options;
  }

  attach(_host: ToolHost, target: EventTarget): () => void {
    const el = target as Element;
    this.#zoom = zoom<Element, unknown>()
      .scaleExtent(this.#options.extent ?? [0.25, 4])
      .on('zoom', (event) => this.#viewport.setTransform(event.transform));
    select(el).call(this.#zoom as any);
    return () => {
      select(el).on('.zoom', null);
    };
  }
}

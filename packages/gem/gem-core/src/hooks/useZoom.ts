//
// Copyright 2022 DXOS.org
//

import * as d3 from 'd3';
import type { ZoomTransform } from 'd3';
import { RefObject, useEffect, useMemo, useRef } from 'react';

import { SVGContext } from '../context';
import { useSvgContext } from './useSvgContext';

export type ZoomExtent = [min: number, max: number];

export type ZoomOptions = {
  enabled?: boolean;
  extent?: ZoomExtent;
  onDblClick?: (zoom: ZoomHandler) => void;
};

export const defaultOptions: ZoomOptions = {
  enabled: true,
  extent: [1 / 2, 2],
  onDblClick: (zoom: ZoomHandler) => zoom.reset()
};

/**
 * Zoom API.
 */
export class ZoomHandler {
  private readonly _zoom;
  private _enabled: boolean;
  private readonly _options: ZoomOptions;

  constructor(
    private readonly _ref: RefObject<SVGGElement>,
    private readonly _context: SVGContext,
    options: ZoomOptions
  ) {
    this._options = Object.assign({}, options, defaultOptions);
    this._enabled = this._options.enabled ?? true;

    // https://github.com/d3/d3-zoom#zoom
    this._zoom = d3.zoom().scaleExtent(this._options.extent ?? defaultOptions.extent);
  }

  /**
   * Gets the refence which the transform is applied to.
   */
  get ref() {
    return this._ref;
  }

  get zoom() {
    return this._zoom;
  }

  init() {
    this.setEnabled(this._enabled);
  }

  setEnabled(enable: boolean) {
    if (enable) {
      d3.select(this._context.svg)
        .call(this._zoom)
        .on('dblclick.zoom', this._options?.onDblClick ? () => this._options.onDblClick(this) : null);
    } else {
      d3.select(this._context.svg).on('.zoom', null); // Unbind the internal event handler.
    }

    this._enabled = enable;
    return this;
  }

  reset(duration = 500) {
    d3.select(this._context.svg).transition().duration(duration).call(this._zoom.transform, d3.zoomIdentity);

    return this;
  }
}

/**
 * Creates the zoom handler.
 * @param options
 */
export const useZoom = (options: ZoomOptions = defaultOptions): ZoomHandler => {
  const ref = useRef<SVGGElement>();
  const context = useSvgContext();
  const zoom = useMemo(() => new ZoomHandler(ref, context, options), []);

  useEffect(() => {
    // Transform container.
    // TODO(burdon): Implement momentum.
    zoom.zoom.on('zoom', ({ transform }: { transform: ZoomTransform }) => {
      context.setTransform(transform); // Fires the resize event (e.g., to update grid).
      d3.select(ref.current).attr('transform', transform as any);
    });

    zoom.init();
  }, [zoom]);

  return zoom;
};

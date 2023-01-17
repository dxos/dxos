//
// Copyright 2022 DXOS.org
//

import * as d3 from 'd3';
import type { ZoomTransform } from 'd3';
import defaultsDeep from 'lodash.defaultsdeep';
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
  private readonly _options: ZoomOptions;
  private _enabled: boolean;

  constructor(
    private readonly _ref: RefObject<SVGGElement | undefined>,
    private readonly _context: SVGContext,
    options: ZoomOptions
  ) {
    this._options = defaultsDeep({}, options, defaultOptions);
    this._enabled = this._options.enabled ?? true;

    // https://github.com/d3/d3-zoom#zoom
    this._zoom = d3.zoom().scaleExtent(this._options.extent ?? (defaultOptions.extent as any));
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
    this.reset(0);
    return this;
  }

  setEnabled(enable: boolean) {
    if (enable) {
      d3.select(this._context.svg)
        .call(this._zoom as any)
        .on(
          'dblclick.zoom',
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          this._options?.onDblClick
            ? () => {
                this._options?.onDblClick!(this);
              }
            : null
        );
    } else {
      d3.select(this._context.svg).on('.zoom', null); // Unbind the internal event handler.
    }

    this._enabled = enable;
    return this;
  }

  reset(duration = 500) {
    // TODO(burdon): Scale to midpoint in extent.
    const scale = this._options.extent?.[0] ?? 1;
    const transform = d3.zoomIdentity.scale(scale);
    d3.select(this._context.svg)
      .transition()
      .duration(duration)
      .call(this._zoom.transform as any, transform);

    return this;
  }
}

/**
 * Creates the zoom handler.
 * @param options
 */
export const useZoom = (options: ZoomOptions = defaultOptions): ZoomHandler => {
  const context = useSvgContext();
  const ref = useRef<SVGGElement>();
  const handler = useMemo(() => new ZoomHandler(ref, context, options), []);

  useEffect(() => {
    // Transform container.
    // TODO(burdon): Implement momentum.
    handler.zoom.on('zoom', ({ transform }: { transform: ZoomTransform }) => {
      context.setTransform(transform); // Fires the resize event (e.g., to update grid).
      d3.select(ref.current!).attr('transform', transform as any);
    });

    handler.init();
  }, [handler]);

  return handler;
};

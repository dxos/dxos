//
// Copyright 2022 DXOS.org
//

import { type ZoomBehavior, type ZoomTransform, select, zoom, zoomIdentity } from 'd3';
import defaultsDeep from 'lodash.defaultsdeep';
import { type RefObject, useEffect, useMemo, useRef } from 'react';

import { type SVGContext, useSvgContext } from './useSvgContext';

export type ZoomExtent = [min: number, max: number];

export type ZoomOptions = {
  enabled?: boolean;
  extent?: ZoomExtent;
  onDblClick?: (zoom: ZoomHandler) => void;
};

const defaultZoomOptions: ZoomOptions = {
  enabled: true,
  extent: [1 / 4, 4],
  onDblClick: (zoom: ZoomHandler) => zoom.reset(),
};

/**
 * Zoom API.
 */
export class ZoomHandler {
  private readonly _zoom: ZoomBehavior<SVGGElement, unknown>;
  private readonly _options: ZoomOptions;
  private _enabled: boolean;

  constructor(
    private readonly _ref: RefObject<SVGGElement>,
    private readonly _context: SVGContext,
    options: ZoomOptions,
  ) {
    this._options = defaultsDeep({}, options, defaultZoomOptions);
    this._enabled = this._options.enabled ?? true;

    // https://github.com/d3/d3-zoom#zoom
    this._zoom = zoom<SVGGElement, unknown>().scaleExtent(this._options.extent ?? (defaultZoomOptions.extent as any));
  }

  /**
   * Gets the reference which the transform is applied to.
   */
  get ref() {
    return this._ref;
  }

  get zoom() {
    return this._zoom;
  }

  init(): this {
    this.setEnabled(this._enabled);
    this.reset(0);
    return this;
  }

  setEnabled(enable: boolean): this {
    if (enable) {
      select(this._context.svg)
        .call(this._zoom as any)
        .on(
          'dblclick.zoom',
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          this._options?.onDblClick
            ? () => {
                this._options?.onDblClick!(this);
              }
            : null,
        );
    } else {
      select(this._context.svg).on('.zoom', null); // Unbind the internal event handler.
    }

    this._enabled = enable;
    return this;
  }

  reset(duration = 500): this {
    // TODO(burdon): Scale to midpoint in extent.
    const scale = 1; // this._options.extent?.[0] ?? 1;
    const transform = zoomIdentity.scale(scale);
    select(this._context.svg)
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
export const useZoom = (options: ZoomOptions = defaultZoomOptions): ZoomHandler => {
  const context = useSvgContext();
  const ref = useRef<SVGGElement>(null);
  const handler = useMemo(() => new ZoomHandler(ref, context, options), [context, options]);

  // TODO(burdon): Distinguish between zoom and pan.
  useEffect(() => {
    // Transform container.
    handler.zoom.on('zoom', ({ transform }: { transform: ZoomTransform }) => {
      context.setTransform(transform); // Fires the resize event (e.g., to update grid).
      select(ref.current!).attr('transform', transform as any);
    });

    handler.init();
  }, [handler]);

  return handler;
};

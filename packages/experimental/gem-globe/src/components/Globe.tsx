//
// Copyright 2018 DXOS.org
//

import * as d3 from 'd3';
import { type GeoProjection } from 'd3';
import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { type Topology } from 'topojson-specification';

import { Event } from '@dxos/async';

import { createLayers, geoInertiaDrag, renderLayers } from '../util';

// https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute
const defaultStyles = {
  background: {
    fillStyle: '#111111',
  },

  water: {
    fillStyle: '#123E6A',
  },

  land: {
    fillStyle: '#032153',
  },

  line: {
    strokeStyle: '#111111',
    strokeWidth: 0.5,
  },

  point: {
    fillStyle: '#111111',
    strokeStyle: '#111111',
    strokeWidth: 1,
    radius: 0.5,
  },
};

export type Vector = [number, number, number];

export type GlobeUpdateEvent = {
  type: 'start' | 'move' | 'end';
  projection: GeoProjection;
};

export type GlobeController = {
  canvas: HTMLCanvasElement;
  update: Event<GlobeUpdateEvent>;
};

export type GlobeProps = {
  projection?: () => GeoProjection; // TODO(burdon): Allow instance.
  styles?: any; // TODO(burdon): Change to tailwind.
  topology?: Topology;
  features?: any; // TODO(burdon): Type.
  offset?: { x: number; y: number };
  rotation?: Vector;
  scale?: number;
  drag?: boolean;
  width: number;
  height: number;
};

const defaultOffset = { x: 0, y: 0 };
const defaultRotation: Vector = [0, 0, 0];
const defaultScale = 0.9;

/**
 * Basic globe renderer.
 * https://github.com/topojson/world-atlas
 */
// TODO(burdon): Factor out canvas, container, useCanvas, etc.
export const Globe = forwardRef<GlobeController, GlobeProps>(
  (
    {
      projection: _projection = d3.geoOrthographic,
      styles = defaultStyles,
      topology,
      features,
      offset = defaultOffset,
      rotation = defaultRotation,
      scale = defaultScale,
      drag = false,
      width = 0,
      height = 0,
    },
    forwardRef,
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // External control.
    const [update] = useState(() => new Event<GlobeUpdateEvent>());
    useImperativeHandle(forwardRef, () => ({ canvas: canvasRef.current, update }), []);

    // Projection.
    const projection = useMemo(() => _projection(), [_projection]);
    const layers = useMemo(
      () => (topology ? createLayers(topology, features, styles) : undefined),
      [topology, features, styles],
    );

    const render = () => {
      // https://github.com/d3/d3-geo#geoPath
      // https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext
      const context = canvasRef.current.getContext('2d', { alpha: false });
      const geoPath = d3.geoPath().context(context).projection(projection);
      renderLayers(geoPath, layers, styles);
    };

    // Drag.
    useEffect(() => {
      if (drag) {
        geoInertiaDrag(
          d3.select(canvasRef.current),
          () => {
            render();
            update.emit({ type: 'move', projection });
          },
          projection,
          {
            start: () => update.emit({ type: 'start', projection }),
            finish: () => update.emit({ type: 'end', projection }),
            time: 3_000,
          },
        );
      }
    }, [projection, drag]);

    useEffect(() => {
      const center = {
        x: offset.x + width / 2,
        y: offset.y + height / 2,
      };

      projection
        // https://github.com/d3/d3-geo#projection_translate
        .translate([center.x, center.y])

        // https://github.com/d3/d3-geo#projection_scale
        .scale((Math.min(width, height) / 2) * scale)

        // https://github.com/d3/d3-geo#projection_rotate
        .rotate(rotation);

      render();
    }, [projection, offset, scale, rotation, width, height]);

    return <canvas ref={canvasRef} width={width} height={height} />;
  },
);

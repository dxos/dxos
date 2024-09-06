//
// Copyright 2018 DXOS.org
//

import * as d3 from 'd3';
import React, { forwardRef, useEffect, useRef, useState } from 'react';

import { useForwardedRef } from '@dxos/react-ui';

import { createLayers, renderLayers, geoInertiaDrag } from '../util';

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

export interface GlobeProps {
  projection?: any;
  styles?: any;
  events?: any;
  topology?: any;
  features?: any;
  offset?: { x: number; y: number };
  rotation?: Vector;
  scale?: number;
  drag?: boolean;
  width: number;
  height: number;
}

/**
 * Basic globe renderer.
 */
// TODO(burdon): Factor out canvas, container, useCanvas, etc.
export const Globe = forwardRef<HTMLCanvasElement, GlobeProps>(
  (
    {
      projection: _projection = d3.geoOrthographic,
      styles = defaultStyles,
      events,
      topology,
      features,
      offset = { x: 0, y: 0 },
      rotation = [0, 0, 0],
      scale = 0.9,
      drag = false,
      width = 0,
      height = 0,
    },
    forwardRef,
  ) => {
    const canvasRef = useForwardedRef<HTMLCanvasElement>(forwardRef);
    const [projection] = useState(() => _projection());

    const layers = useRef<any>(null);
    useEffect(() => {
      if (topology) {
        layers.current = createLayers(topology, features, styles);
      }
    }, [topology, features, styles]);

    const geoPath = useRef<unknown>();

    // Render
    useEffect(() => {
      if (!canvasRef.current || !layers.current) {
        return;
      }

      // https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext
      const context = canvasRef.current.getContext('2d');

      // https://github.com/d3/d3-geo#geoPath
      geoPath.current = d3.geoPath().context(context).projection(projection);

      // https://github.com/Fil/d3-inertia
      if (drag) {
        // TODO(burdon): Cancel if unmounted.
        geoInertiaDrag(
          d3.select(canvasRef.current),
          () => {
            renderLayers(geoPath.current, layers.current, styles);

            events &&
              events.emit('update', {
                translation: projection.translate(),
                scale: projection.scale(),
                rotation: projection.rotate(),
              });
          },
          projection,
          { time: 3000 },
        );
      }

      renderLayers(geoPath.current, layers.current, styles);
    }, [projection, layers, drag]);

    //
    // Update projection and render.
    //
    useEffect(() => {
      if (!geoPath.current || !layers.current) {
        return;
      }

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

      renderLayers(geoPath.current, layers.current, styles);
    }, [projection, geoPath, layers, rotation, scale, styles, width, height]);

    return <canvas ref={canvasRef} width={width} height={height} />;
  },
);

//
// Copyright 2018 DXOS.org
//

import * as d3 from 'd3';
import { GeoPath, GeoPermissibleObjects } from 'd3';
import { geoInertiaDrag } from 'd3-inertia';
import React, { MutableRefObject, forwardRef, useEffect, useRef } from 'react';

import { createLayers, renderLayers } from '../util';

// https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute
const defaultStyles = {
  background: {
    fillStyle: '#111'
  },

  water: {
    fillStyle: '#123E6A'
  },

  land: {
    fillStyle: '#032153'
  },

  line: {
    strokeStyle: '#111',
    strokeWidth: 0.5
  },

  point: {
    fillStyle: '#111',
    strokeStyle: '#111',
    strokeWidth: 1,
    radius: 0.5
  }
};

export interface GlobeProps {
  projection?: any
  styles?: any
  events?: any
  topology?: any
  features?: any
  offset?: { x: number, y: number }
  rotation?: [number, number, number]
  scale?: number
  drag?: boolean
  width: number
  height: number
}

/**
 * Basic globe renderer.
 */
// TODO(burdon): Factor out canvas, container, useCanvas, etc.
// eslint-disable-next-line react/display-name
export const Globe = forwardRef<HTMLCanvasElement, GlobeProps>((
  props: GlobeProps,
  canvasRef: MutableRefObject<HTMLCanvasElement>
) => {
  canvasRef = canvasRef || useRef(null);

  const {
    projection = d3.geoOrthographic,
    styles = defaultStyles,
    events,
    topology,
    features,
    offset = { x: 0, y: 0 },
    rotation = [0, 0, 0],
    scale = 0.9,
    drag = false,
    width = 0,
    height = 0
  } = props;

  //
  // Features
  //

  const layers = useRef(null);
  useEffect(() => {
    if (topology) {
      layers.current = createLayers(topology, features, styles);
    }
  }, [topology, features, styles]);

  //
  // Init.
  //

  const geoPath = useRef<GeoPath<any, GeoPermissibleObjects>>();

  // NOTE: The d3 projection object is a function, which cannot be used directly as a state object.
  const projectionRef = useRef(projection());

  // Render
  useEffect(() => {
    projectionRef.current = projection();

    // https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext
    const context = canvasRef.current.getContext('2d');

    // https://github.com/d3/d3-geo#geoPath
    geoPath.current = d3.geoPath()
      .context(context)
      .projection(projectionRef.current);

    // https://github.com/Fil/d3-inertia
    if (drag) {
      // TODO(burdon): Cancel if unmounted.
      geoInertiaDrag(d3.select(canvasRef.current), () => {
        renderLayers(geoPath.current, layers.current, styles);

        events && events.emit('update', {
          translation: projectionRef.current.translate(),
          scale: projectionRef.current.scale(),
          rotation: projectionRef.current.rotate()
        });
      }, projectionRef.current, { time: 3000 });
    }

    renderLayers(geoPath.current, layers.current, styles);
  }, [projection, layers, drag]);

  //
  // Update projection and render.
  //

  useEffect(() => {
    const center = {
      x: offset.x + width / 2,
      y: offset.y + height / 2
    };

    projectionRef.current
      // https://github.com/d3/d3-geo#projection_translate
      .translate([center.x, center.y])

      // https://github.com/d3/d3-geo#projection_scale
      .scale((Math.min(width, height) / 2) * scale)

      // https://github.com/d3/d3-geo#projection_rotate
      .rotate(rotation);

    renderLayers(geoPath.current, layers.current, styles);
  }, [projection, geoPath, layers, rotation, scale, styles, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
    />
  );
});

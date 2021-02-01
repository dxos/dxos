//
// Copyright 2018 DXOS.org
//

const d3 = Object.assign({}, require('d3'), require('d3-inertia'));
import React, { forwardRef, useEffect, useRef } from 'react';

import { createLayers, renderLayers, } from '../util';

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
    strokeWidth: .5,
  },

  point: {
    fillStyle: '#111',
    strokeStyle: '#111',
    strokeWidth: 1,
    radius: .5
  }
};

/**
 * Basic globe renderer.
 *
 * @param props
 * @param props.styles
 * @param props.events
 * @param props.projection
 * @param props.topology
 * @param props.features
 * @param props.offset
 * @param props.rotation
 * @param props.scale
 * @param props.drag
 * @param {Object|undefined} canvas
 */
// eslint-disable-next-line react/display-name
const Globe = forwardRef((props, canvas) => {
  canvas = canvas || useRef(null);

  const {
    projection = d3.geoOrthographic,
    events,
    topology,
    features,
    offset = { x: 0, y: 0 },
    rotation = [0, 0, 0],
    scale = 0.9,
    drag = false,
    width,
    height
  } = props;

  let styles = props.styles || defaultStyles;

  //
  // Features
  //

  const layers = useRef(null);
  useEffect(() => {
    layers.current = createLayers(topology, features, styles);
  }, [topology, features, styles ]);

  //
  // Init.
  //

  const geoPath = useRef(null);

  // NOTE: The d3 projection object is a function, which cannot be used directly as a state object.
  const projectionRef = useRef(projection());

  // Render
  useEffect(() => {
    projectionRef.current = projection();

    // https://github.com/d3/d3-geo#geoPath
    // https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext
    geoPath.current = d3.geoPath()
      .context(canvas.current.getContext('2d'))
      .projection(projectionRef.current);

    // https://github.com/Fil/d3-inertia
    if (drag) {
      // TODO(burdon): Cancel if unmounted.
      d3.geoInertiaDrag(d3.select(canvas.current), () => {
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
      .translate([ center.x, center.y ])

      // https://github.com/d3/d3-geo#projection_scale
      .scale((Math.min(width, height) / 2) * scale)

      // https://github.com/d3/d3-geo#projection_rotate
      .rotate(rotation);

    renderLayers(geoPath.current, layers.current, styles);
  }, [projection, geoPath, layers, rotation, scale, styles, width, height]);

  return (
    <canvas ref={canvas} width={width} height={height} />
  );
});

export default Globe;

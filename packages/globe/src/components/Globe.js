//
// Copyright 2018 DxOS
//

const d3 = Object.assign({}, require('d3'), require('d3-inertia'));
import * as topojson from 'topojson';
import React, { forwardRef, useEffect, useRef } from 'react';
import useResizeAware from 'react-resize-aware';

// TODO(burdon): Factor out components.

//
// Utils.
//

// https://github.com/d3/d3-geo#geoCircle
const circle = ({ lat, lng }, radius) => d3.geoCircle().center([lng, lat]).radius(radius)();

const line = (p1, p2) => ({
  type: 'LineString',
  coordinates: [
    [p1.lng, p1.lat],
    [p2.lng, p2.lat]
  ]
});

// TODO(burdon): Factor out.
const renderFeatures = (geoPath, features, styles) => {
  const context = geoPath.context();
  const { canvas: { width, height } } = context;

  // Clear background.
  if (styles.background) {
    context.fillStyle = styles.background.fillStyle;
    context.fillRect(0, 0, width, height);
  } else {
    context.clearRect(0, 0, width, height);
  }

  // Render features.
  // https://github.com/d3/d3-geo#_path
  features.forEach(({ path, styles = {} }) => {
    let doFill = false;
    let doStroke = false;

    Object.keys(styles).forEach(key => {
      const value = styles[key];
      context[key] = value;
      doFill = (doFill || key === 'fillStyle' && value);
      doStroke = (doStroke || key === 'strokeStyle' && value);
    });

    context.beginPath();
    geoPath(path);

    if (doFill) {
      context.fill();
    }

    if (doStroke) {
      context.stroke();
    }
  });
};

/**
 *
 * @param topology
 * @param features
 * @param styles
 * @returns {[{path: {type: string}, styles: *}]}
 */
const createLayers = (topology, features, styles) => {
  const layers = [
    {
      styles: styles.water,
      path: {
        type: 'Sphere'
      }
    }
  ];

  if (styles.graticule) {
    layers.push({
      styles: styles.graticule,
      path: d3.geoGraticule().step([10, 5])()
    });
  }

  if (topology) {
    layers.push(...[
      {
        styles: styles.land,
        path: topojson.feature(topology, topology.objects.land)
      },
      {
        // TODO(burdon): Optional.
        styles: styles.border,
        path: topojson.mesh(topology, topology.objects.countries, (a, b) => a !== b)
      }
    ]);
  }

  if (features && styles.line && styles.point) {
    const { lines = [], points = [] } = features;
    layers.push(...[
      {
        // TODO(burdon): Animate.
        // https://observablehq.com/@mbostock/top-100-cities
        styles: styles.line,
        path: {
          type: 'GeometryCollection',
          geometries: lines.map(({ source, target }) => line(source, target))
        },
      },
      {
        styles: styles.point,
        path: {
          type: 'GeometryCollection',
          geometries: points.map(point => circle(point, styles.point.radius))
        }
      }
    ]);
  }

  return layers;
};

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
const Globe2 = forwardRef((props, canvas) => {
  canvas = canvas || useRef();

  const {
    projection = d3.geoOrthographic,
    events,
    topology,
    features,
    offset = { x: 0, y: 0 },
    rotation = [0, 0, 0],
    scale = 0.9,
    drag = false
  } = props;

  let styles = props.styles || defaultStyles;

  const [resizeListener, { width, height }] = useResizeAware();

  //
  // Features
  //

  const layers = useRef();
  useEffect(() => {
    layers.current = createLayers(topology, features, styles);
  }, [topology, features, styles ]);

  //
  // Init.
  //

  const geoPath = useRef();

  // NOTE: The d3 projection object is a function, which cannot be used directly as a state object.
  const projectionRef = useRef(projection());

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
        renderFeatures(geoPath.current, layers.current, styles);

        events && events.emit('update', {
          translation: projectionRef.current.translate(),
          scale: projectionRef.current.scale(),
          rotation: projectionRef.current.rotate()
        });
      }, projectionRef.current, { time: 3000 });
    }

    renderFeatures(geoPath.current, layers.current, styles);
  }, [projection, layers, drag]);

  //
  // Update projection and render.
  //

  useEffect(() => {

    //
    // Update projection.
    //

    {
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
    }

    //
    // Features.
    //

    renderFeatures(geoPath.current, layers.current, styles);

  }, [projection, geoPath, layers, rotation, scale, styles, width, height]);

  return (
    <div>
      {resizeListener}
      <canvas ref={canvas} width={width} height={height}/>
    </div>
  );
});

export default Globe2;

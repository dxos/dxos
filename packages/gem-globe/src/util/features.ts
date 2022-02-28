//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';
import * as topojson from 'topojson-client';

import { geoCircle, line } from './path';

/**
 * Create rendering layers.
 * @param topology
 * @param features
 * @param styles
 * @returns {[{path: {type: string}, styles: *}]}
 */
export const createLayers = (topology, features, styles) => {
  const layers = [];

  if (styles.water) {
    layers.push({
      styles: styles.water,
      path: {
        type: 'Sphere'
      }
    });
  }

  if (styles.graticule) {
    layers.push({
      styles: styles.graticule,
      path: d3.geoGraticule().step([6, 6])()
    });
  }

  if (topology) {
    layers.push(...[
      {
        styles: styles.land,
        path: topojson.feature(topology, topology.objects.land)
      },
      {
        // TODO(burdon): Option.
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
        }
      },
      {
        styles: styles.point,
        path: {
          type: 'GeometryCollection',
          geometries: points.map(point => geoCircle(point, styles.point.radius)())
        }
      }
    ]);
  }

  return layers;
};

/**
 * Render layers created above.
 *
 * @param geoPath
 * @param layers
 * @param styles
 */
export const renderLayers = (geoPath, layers = [], styles) => {
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
  layers.forEach(({ path, styles = {} }) => {
    let doFill = false;
    let doStroke = false;

    Object.keys(styles).forEach(key => {
      const value = styles[key];
      context[key] = value;
      doFill = (doFill || key === 'fillStyle') && value;
      doStroke = (doStroke || key === 'strokeStyle') && value;
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

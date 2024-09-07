//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { type Topology } from 'topojson-specification';

import { geoCircle, type LatLng, line } from './path';

/**
 * Create rendering layers.
 */
export const createLayers = (
  topology: Topology,
  features: { lines: { source: LatLng; target: LatLng }[]; points: LatLng[] },
  styles: any,
) => {
  const layers = [];

  if (styles.water) {
    layers.push({
      styles: styles.water,
      path: {
        type: 'Sphere',
      },
    });
  }

  if (styles.graticule) {
    layers.push({
      styles: styles.graticule,
      path: d3.geoGraticule().step([6, 6])(),
    });
  }

  if (topology) {
    layers.push(
      ...[
        {
          styles: styles.land,
          path: topojson.feature(topology, topology.objects.land),
        },
        {
          styles: styles.border,
          path: topojson.mesh(topology, topology.objects.countries, (a: any, b: any) => a !== b),
        },
      ],
    );
  }

  if (features && styles.line && styles.point) {
    const { lines = [], points = [] } = features;
    layers.push(
      ...[
        {
          styles: styles.line,
          path: {
            // TODO(burdon): Make create circle.
            type: 'GeometryCollection',
            geometries: lines.map(({ source, target }) => line(source, target)),
          },
        },
        {
          styles: styles.point,
          path: {
            type: 'GeometryCollection',
            geometries: points.map((point) => geoCircle(point, styles.point.radius)()),
          },
        },
      ],
    );
  }

  return layers;
};

/**
 * Render layers created above.
 */
export const renderLayers = (geoPath: d3.GeoPath, layers = [], styles: any) => {
  const context: CanvasRenderingContext2D = geoPath.context();
  const {
    canvas: { width, height },
  } = context;

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
    let doFill: boolean | undefined;
    let doStroke: boolean | undefined;

    // context.setLineDash([2, 8]);
    // context.lineDashOffset = (Date.now() / 100) % 16

    Object.keys(styles).forEach((key) => {
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

  return context;
};

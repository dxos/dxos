//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';
import { type GeoPath, type GeoPermissibleObjects } from 'd3';
import * as topojson from 'topojson-client';
import { type Topology } from 'topojson-specification';

import { geoCircle, type LatLng, line } from './path';

export type Styles = Record<string, any>;

export type StyleSet = Record<string, Styles>;

export type Features = {
  points?: LatLng[];
  lines?: { source: LatLng; target: LatLng }[];
};

export type Layer = {
  styles: Styles;
  path: GeoPermissibleObjects;
};

/**
 * Create rendering layers.
 */
export const createLayers = (topology: Topology, features: Features, styles: StyleSet) => {
  const layers: Layer[] = [];

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
    if (topology.objects.land && styles.land) {
      layers.push({
        styles: styles.land,
        path: topojson.feature(topology, topology.objects.land),
      });
    }

    if (topology.objects.countries && styles.border) {
      layers.push({
        styles: styles.border,
        path: topojson.mesh(topology, topology.objects.countries, (a: any, b: any) => a !== b),
      });
    }

    if (topology.objects.hex && styles.hex) {
      // layers.push({
      //   styles: styles.hex,
      //   path: topology.objects.hex as any,
      // });
    }

    // TODO(burdon): Convert to circles.
    if (topology.objects.hex && styles.hex) {
      const findCenter = (points: [number, number][]) => {
        const [x, y] = points.reduce((acc, [x, y]) => [acc[0] + x, acc[0] + y], [0, 0]);
        return { x: x / points.length, y: y / points.length };
      };

      const points = topology.objects.hex.geometry.coordinates.map((hex) => {
        const coordinates = hex[0];
        return findCenter(coordinates);
      });

      layers.push({
        styles: styles.hex,
        path: {
          type: 'GeometryCollection',
          geometries: points.map((point) => geoCircle(point, 0.2)()),
        },
      });
    }
  }

  if (features) {
    const { points, lines } = features;

    if (points) {
      layers.push({
        styles: styles.point,
        path: {
          type: 'GeometryCollection',
          geometries: points.map((point) => geoCircle(point, styles.point.radius)()),
        },
      });
    }

    if (lines) {
      layers.push({
        styles: styles.line,
        path: {
          type: 'GeometryCollection',
          geometries: lines.map(({ source, target }) => line(source, target)),
        },
      });
    }
  }

  return layers;
};

/**
 * Render layers created above.
 */
export const renderLayers = (generator: GeoPath, layers: Layer[] = [], styles: StyleSet) => {
  const context: CanvasRenderingContext2D = generator.context();
  const {
    canvas: { width, height },
  } = context;
  context.reset();

  // Clear background.
  context.save();
  if (styles.background) {
    context.fillStyle = styles.background.fillStyle;
    context.fillRect(0, 0, width, height);
  } else {
    context.clearRect(0, 0, width, height);
  }
  context.restore();

  // Render features.
  // https://github.com/d3/d3-geo#_path
  layers.forEach(({ path, styles }, i) => {
    context.save();
    let fill = false;
    let stroke = false;
    if (styles) {
      Object.entries(styles).forEach(([key, value]) => {
        context[key] = value;
        fill ||= key === 'fillStyle';
        stroke ||= key === 'strokeStyle';
      });
    }

    context.beginPath();
    generator(path);
    fill && context.fill();
    stroke && context.stroke();
    context.restore();
  });

  return context;
};

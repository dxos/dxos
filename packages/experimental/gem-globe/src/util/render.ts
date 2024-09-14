//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';
import { type GeoPath, type GeoPermissibleObjects } from 'd3';
import * as topojson from 'topojson-client';
import { type Topology } from 'topojson-specification';

import { geoCircle, type LatLng, geoLine } from './path';

export type Styles = Record<string, any>;

export type Style = 'water' | 'graticule' | 'land' | 'border' | 'dots' | 'point' | 'line';

export type StyleSet = Partial<Record<Style, Styles>>;

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
export const createLayers = (topology: Topology, features: Features, styles: StyleSet): Layer[] => {
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

  //
  // Topology.
  //

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

    if (topology.objects.dots && styles.dots) {
      layers.push({
        styles: styles.dots,
        path: topology.objects.dots as any, // TODO(burdon): Type.
      });
    }
  }

  //
  // Features.
  //

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
          geometries: lines.map(({ source, target }) => geoLine(source, target)),
        },
      });
    }
  }

  return layers;
};

/**
 * Render layers created above.
 */
export const renderLayers = (generator: GeoPath, layers: Layer[] = [], scale: number) => {
  const context: CanvasRenderingContext2D = generator.context();
  const {
    canvas: { width, height },
  } = context;
  context.reset();

  // TODO(burdon): Option.
  // Clear background.
  context.clearRect(0, 0, width, height);

  // Render features.
  // https://github.com/d3/d3-geo#_path
  layers.forEach(({ path, styles }) => {
    context.save();
    let fill = false;
    let stroke = false;
    if (styles) {
      Object.entries(styles).forEach(([key, value]) => {
        if (key === 'pointRadius') {
          generator.pointRadius(value * scale);
        } else {
          context[key] = value;
          fill ||= key === 'fillStyle';
          stroke ||= key === 'strokeStyle';
        }
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

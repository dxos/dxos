//
// Copyright 2020 DXOS.org
//

import { type GeoPath, type GeoPermissibleObjects } from 'd3';
import { type Topology } from 'topojson-specification';

import { geoCircle, type LatLng, geoLine, geoPoint } from './path';

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
    // layers.push({
    //   styles: styles.water,
    //   path: {
    //     type: 'Sphere',
    //   },
    // });
  }

  if (styles.graticule) {
    // layers.push({
    //   styles: styles.graticule,
    //   path: d3.geoGraticule().step([6, 6])(),
    // });
  }

  if (topology) {
    // if (topology.objects.land && styles.land) {
    //   layers.push({
    //     styles: styles.land,
    //     path: topojson.feature(topology, topology.objects.land),
    //   });
    // }

    // if (topology.objects.countries && styles.border) {
    //   layers.push({
    //     styles: styles.border,
    //     path: topojson.mesh(topology, topology.objects.countries, (a: any, b: any) => a !== b),
    //   });
    // }

    if (topology.objects.hex && styles.hex) {
      // layers.push({
      //   styles: styles.hex,
      //   path: topology.objects.hex as any,
      // });
    }

    if (topology.objects.hex && styles.hex) {
      const findCenter = (points: [number, number][]) => {
        const [x, y] = points.reduce((acc, [x, y]) => [acc[0] + x, acc[1] + y], [0, 0]);
        return [x / points.length, y / points.length];
      };

      // Convert to points.
      // TODO(burdon): Pre-compute (loading data set is expensive).
      const points = (topology.objects.hex as any).geometry.coordinates.map((hex) => {
        const coordinates = hex[0];
        const center = findCenter(coordinates);
        // TODO(burdon): Create controller with options.
        return { lat: center[1], lng: center[0] };
        // Interesting effect with randomness.
        // const d = 1;
        // return { lat: center[1] + Math.random() / d, lng: center[0] + Math.random() / d };
        // TODO(burdon): Snap points to lat/lng.
        // return { lat: Math.floor(center[1]), lng: center[0] };
        // return { lat: center[1], lng: Math.floor(center[0]) };
      });

      layers.push({
        styles: styles.hex,
        path: {
          type: 'GeometryCollection',
          geometries: points.map((point) => geoPoint(point)),
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
export const renderLayers = (generator: GeoPath, layers: Layer[] = [], styles: StyleSet) => {
  const context: CanvasRenderingContext2D = generator.context();
  const {
    canvas: { width, height },
  } = context;
  context.reset();

  // TODO(burdon): Option.
  // Clear background.
  // context.clearRect(0, 0, width, height);

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
    console.log(`render ${i + 1}/${layers.length}`);
    generator(path);
    fill && context.fill();
    stroke && context.stroke();
    context.restore();
  });

  return context;
};

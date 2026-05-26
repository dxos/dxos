//
// Copyright 2020 DXOS.org
//

import { type GeoPath, type GeoPermissibleObjects, geoBounds, geoCentroid, geoDistance, geoGraticule } from 'd3';
import { type Feature, type Geometry } from 'geojson';
import { feature, mesh } from 'topojson-client';
import { type Topology } from 'topojson-specification';

import { type LatLngLiteral } from '../types';
import { geoLine, geoPoint } from './path';

export type Styles = Record<string, any>;

export type Style =
  | 'background'
  | 'water'
  | 'graticule'
  | 'land'
  | 'border'
  | 'dots'
  | 'point'
  | 'line'
  | 'cursor'
  | 'arc';

export type StyleSet = Partial<Record<Style, Styles>>;

export type Features = {
  points?: LatLngLiteral[];
  lines?: { source: LatLngLiteral; target: LatLngLiteral }[];
};

/**
 * Per-feature bounding circle used for view-frustum culling on an
 * orthographic globe. `centroid` is in lon/lat degrees and `radius` is the
 * angular distance (degrees) from the centroid to the farthest sampled
 * vertex of the feature.
 */
export type FeatureBounds = {
  geometry: Geometry;
  centroid: [number, number];
  radius: number;
};

export type Layer = {
  styles: Styles;
  path: GeoPermissibleObjects;
  /**
   * If present, this layer is treated as a `GeometryCollection` whose
   * member geometries are filtered per-frame by `viewCenter` against each
   * member's `FeatureBounds`. `path` becomes the *unculled* fallback used
   * when no `viewCenter` is supplied (e.g. non-orthographic projections).
   */
  cullable?: FeatureBounds[];
};

const RAD_TO_DEG = 180 / Math.PI;

/**
 * Compute a spherical bounding circle for a GeoJSON feature. We sample the
 * geoBounds corners (cheap, sufficient for typical country shapes); for
 * features crossing the antimeridian d3.geoBounds returns west > east, which
 * geoDistance handles correctly when called on the actual centroid.
 */
const computeBounds = (geometry: Geometry): FeatureBounds => {
  const feat: Feature = { type: 'Feature', geometry, properties: {} };
  const centroid = geoCentroid(feat) as [number, number];
  const [[w, s], [e, n]] = geoBounds(feat);
  // Sample the four bbox corners; widest is the bounding radius.
  const corners: Array<[number, number]> = [
    [w, s],
    [w, n],
    [e, s],
    [e, n],
  ];
  let radius = 0;
  for (const corner of corners) {
    const d = geoDistance(centroid, corner) * RAD_TO_DEG;
    if (d > radius) {
      radius = d;
    }
  }
  return { geometry, centroid, radius };
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
      path: geoGraticule().step([6, 6])(),
    });
  }

  //
  // Topology.
  //

  if (topology) {
    if (styles.land) {
      // Prefer the `countries` GeometryCollection over the merged `land`
      // multipolygon so each country can be culled independently. Visually
      // identical (countries collectively tile the land surface).
      if (topology.objects.countries) {
        const fc = feature(topology, topology.objects.countries) as any;
        const memberGeoms: Geometry[] = fc.features.map((f: Feature) => f.geometry);
        const bounds = memberGeoms.map(computeBounds);
        layers.push({
          styles: styles.land,
          path: { type: 'GeometryCollection', geometries: memberGeoms } as any,
          cullable: bounds,
        });
      } else if (topology.objects.land) {
        layers.push({
          styles: styles.land,
          path: feature(topology, topology.objects.land),
        });
      }
    }

    if (topology.objects.countries && styles.border) {
      layers.push({
        styles: styles.border,
        path: mesh(topology, topology.objects.countries, (a: any, b: any) => a !== b),
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

    // Lines first so points (drawn after) sit on top — the route nodes should
    // never be occluded by an arc that passes through them.
    if (lines && styles.line) {
      layers.push({
        styles: styles.line,
        path: {
          type: 'GeometryCollection',
          geometries: lines.map(({ source, target }) => geoLine(source, target)),
        },
      });
    }

    if (points && styles.point) {
      layers.push({
        styles: styles.point,
        path: {
          type: 'GeometryCollection',
          geometries: points.map((point) => geoPoint(point)),
        },
      });
    }
  }

  return layers;
};

/**
 * Render layers created above.
 *
 * When `viewCenter` is supplied (orthographic globe), layers with a
 * `cullable` index are filtered to just the features whose bounding circle
 * intersects the visible hemisphere — keeping the d3-geo walk proportional
 * to what's actually on-screen.
 */
export const renderLayers = (
  generator: GeoPath,
  layers: Layer[] = [],
  scale: number,
  styles: StyleSet,
  viewCenter?: [number, number],
) => {
  const context: CanvasRenderingContext2D = generator.context();
  const {
    canvas: { width, height },
  } = context;
  context.reset();

  // Clear background.
  if (styles.background) {
    context.fillStyle = styles.background.fillStyle;
    context.fillRect(0, 0, width, height);
  } else {
    context.clearRect(0, 0, width, height);
  }

  // Render features.
  // https://github.com/d3/d3-geo#_path
  layers.forEach((layer) => {
    const { path, styles, cullable } = layer;
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

    let renderPath = path;
    if (cullable && viewCenter) {
      const geometries: Geometry[] = [];
      for (let index = 0; index < cullable.length; index++) {
        const bounds = cullable[index];
        const angularDistance = geoDistance(viewCenter, bounds.centroid) * RAD_TO_DEG;
        if (angularDistance < 90 + bounds.radius) {
          geometries.push(bounds.geometry);
        }
      }
      renderPath = { type: 'GeometryCollection', geometries } as any;
    }

    context.beginPath();
    generator(renderPath);
    fill && context.fill();
    stroke && context.stroke();
    context.restore();
  });

  return context;
};

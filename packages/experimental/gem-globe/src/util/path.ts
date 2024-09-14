//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';
import { type GeoCircleGenerator, type GeoGeometryObjects } from 'd3';
import { type Feature, type MultiPoint, type MultiPolygon, type Position } from 'geojson';
import { type GeometryCollection } from 'topojson-specification';

import type { Vector } from '../hooks';

export type LatLng = { lat: number; lng: number };

export const pointToRotation = ([lng, lat]: [number, number], tilt = 0): Vector => [-lng, tilt - lat, 0];

export const geoToPoint = ({ lat, lng }: LatLng): [number, number] => [lng, lat];

// https://github.com/d3/d3-geo#geoCircle
export const geoCircle = ({ lat, lng }: LatLng, radius: number): GeoCircleGenerator =>
  d3.geoCircle().radius(radius).center([lng, lat]);

export const geoLine = (p1: LatLng, p2: LatLng): GeoGeometryObjects => ({
  type: 'LineString',
  coordinates: [
    [p1.lng, p1.lat],
    [p2.lng, p2.lat],
  ],
});

/**
 * Convert hex multipolygon to centroid points.
 */
export const hexagonsToPoints = (hex: Feature<MultiPolygon>): GeometryCollection => {
  const findCenter = (points: Position[]): Position => {
    const [x, y] = points.reduce((acc, [x, y]) => [acc[0] + x, acc[1] + y], [0, 0]);
    return [x / points.length, y / points.length];
  };

  // Convert to points.
  const points = hex.geometry.coordinates.map((hex) => {
    const coordinates = hex[0];
    const center = findCenter(coordinates);
    // TODO(burdon): Interesting effect with snapping and/or randomness lat/lng.
    // Interesting effect with randomness.
    // const d = 1;
    // return { lat: center[1] + Math.random() / d, lng: center[0] + Math.random() / d };
    // return { lat: Math.floor(center[1]), lng: center[0] };
    // return { lat: center[1], lng: Math.floor(center[0]) };
    return { lat: center[1], lng: center[0] };
  });

  return {
    type: 'GeometryCollection',
    geometries: [
      {
        type: 'MultiPoint',
        coordinates: points.map((point) => geoToPoint(point)),
      },
    ],
  } satisfies GeometryCollection<MultiPoint>;
};

export const closestPoint = (points: Position[], target: Position): Position | null => {
  if (points.length === 0) {
    return target;
  }

  let closestPoint = points[0];
  let minDistance = getDistance(points[0], target);

  for (const point of points) {
    const distance = getDistance(point, target);
    if (distance < minDistance) {
      minDistance = distance;
      closestPoint = point;
    }
  }

  return closestPoint;
};

export const getDistance = (point1: Position, point2: Position): number => {
  const dx = point1[0] - point2[0];
  const dy = point1[1] - point2[1];
  return Math.sqrt(dx * dx + dy * dy);
};

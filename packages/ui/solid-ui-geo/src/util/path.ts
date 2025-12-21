//
// Copyright 2025 DXOS.org
//

import { type GeoGeometryObjects, geoCircle as d3GeoCircle } from 'd3';
import { type Point, type Polygon, type Position } from 'geojson';
import { type LatLngLiteral } from 'leaflet';

import type { Vector } from '../hooks';

export const positionToRotation = ([lng, lat]: [number, number], tilt = 0): Vector => [-lng, tilt - lat, 0];

export const geoToPosition = ({ lat, lng }: LatLngLiteral): [number, number] => [lng, lat];

export const geoPoint = (point: LatLngLiteral): Point => ({ type: 'Point', coordinates: geoToPosition(point) });

// https://github.com/d3/d3-geo#geoCircle
export const geoCircle = ({ lat, lng }: LatLngLiteral, radius: number): Polygon =>
  d3GeoCircle().radius(radius).center([lng, lat])();

export const geoLine = (p1: LatLngLiteral, p2: LatLngLiteral): GeoGeometryObjects => ({
  type: 'LineString',
  coordinates: [
    [p1.lng, p1.lat],
    [p2.lng, p2.lat],
  ],
});

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

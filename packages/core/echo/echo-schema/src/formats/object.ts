//
// Copyright 2024 DXOS.org
//

import { AST, S } from '@dxos/effect';

import { FormatAnnotationId, FormatEnum } from './types';

/**
 * GeoJSON Format
 * https://datatracker.ietf.org/doc/html/rfc7946
 * https://datatracker.ietf.org/doc/html/rfc7946#section-3.1.1
 * https://en.wikipedia.org/wiki/Geographic_coordinate_system
 * https://geojson.org
 * {
 *   type: 'Feature',
 *   geometry: {
 *     type: "Point",
 *     coordinates: [0.1278, 51.5074],
 *   },
 *   properties: {
 *     name: 'London'
 *   }
 * }
 *
 * Note: optional third element for altitude.
 */
// TODO(burdon): Should we support the (more verbose/nested) GeoJSON format directly?
export const GeoPoint = S.Tuple(
  S.Number.pipe(S.clamp(-180, 180), S.multipleOf(0.00001)).annotations({
    [AST.TitleAnnotationId]: 'Longitude',
  }),
  S.Number.pipe(S.clamp(-90, 90), S.multipleOf(0.00001)).annotations({
    [AST.TitleAnnotationId]: 'Latitude',
  }),
  S.optionalElement(S.Number).annotations({
    [AST.TitleAnnotationId]: 'Height ASL (m)',
  }),
).annotations({
  [FormatAnnotationId]: FormatEnum.GeoPoint,
  [AST.TitleAnnotationId]: 'GeoPoint',
  [AST.DescriptionAnnotationId]: 'GeoJSON Position',
});

export type GeoPoint = S.Schema.Type<typeof GeoPoint>;

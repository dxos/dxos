//
// Copyright 2024 DXOS.org
//

import { AST, S } from '@dxos/effect';

import { FormatAnnotationId, FormatEnum } from './types';

/**
 * https://en.wikipedia.org/wiki/Geographic_coordinate_system
 * https://geojson.org
 * {
 *   "type": "Point",
 *   "coordinates": [30.0, 10.0]
 * }
 */
export const LatLng = S.Struct({
  lat: S.Number.pipe(S.clamp(-180, 180), S.multipleOf(0.00001)),
  lng: S.Number.pipe(S.clamp(-90, 90), S.multipleOf(0.00001)),
}).annotations({
  [FormatAnnotationId]: FormatEnum.LatLng,
  [AST.TitleAnnotationId]: 'LatLng',
  [AST.DescriptionAnnotationId]: 'LatLng coordinates',
});

export type LatLng = S.Schema.Type<typeof LatLng>;

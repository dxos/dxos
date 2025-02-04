//
// Copyright 2023 DXOS.org
//

import { type LatLngLiteral } from 'leaflet';

import { GeoPoint, S } from '@dxos/echo-schema';

import { MapType } from './map';
import { MAP_PLUGIN } from '../meta';

export namespace MapAction {
  const MAP_ACTION = `${MAP_PLUGIN}/action`;

  export class Create extends S.TaggedClass<Create>()(`${MAP_ACTION}/create`, {
    input: S.Struct({
      name: S.optional(S.String),
      coordinates: S.optional(GeoPoint),
    }),
    output: S.Struct({
      object: MapType,
    }),
  }) {}

  export class Toggle extends S.TaggedClass<Toggle>()(`${MAP_ACTION}/toggle`, {
    input: S.Void,
    output: S.Void,
  }) {}
}

export type MapMarker = {
  id: string;
  title?: string;
  location: LatLngLiteral;
};

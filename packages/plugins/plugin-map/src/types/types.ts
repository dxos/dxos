//
// Copyright 2023 DXOS.org
//

import { GeoPoint, S } from '@dxos/echo-schema';
import { type LatLngLiteral } from '@dxos/react-ui-geo';

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

// TODO(burdonn): Move to react-ui-geo
export type MapMarker = {
  id: string;
  title?: string;
  location: LatLngLiteral;
};

//
// Copyright 2023 DXOS.org
//

import { type LatLngLiteral } from 'leaflet';

import type {
  GraphBuilderProvides,
  IntentResolverProvides,
  TranslationsProvides,
  SurfaceProvides,
  MetadataRecordsProvides,
} from '@dxos/app-framework';
import { S } from '@dxos/echo-schema';
import { type SchemaProvides } from '@dxos/plugin-space';

import { MapType } from './map';
import { type MapControlType } from '../components';
import { MAP_PLUGIN } from '../meta';

export namespace MapAction {
  const MAP_ACTION = `${MAP_PLUGIN}/action`;

  export class Create extends S.TaggedClass<Create>()(`${MAP_ACTION}/create`, {
    input: S.Struct({
      name: S.optional(S.String),
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

export type MapSettingsProps = {
  type: MapControlType;
  center?: LatLngLiteral;
  zoom?: number;
};

export type MapPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  MetadataRecordsProvides &
  TranslationsProvides &
  SchemaProvides;

export type MapMarker = {
  id: string;
  title?: string;
  location: LatLngLiteral;
};

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
import { type SchemaProvides } from '@dxos/plugin-space';
import { type StackProvides } from '@dxos/plugin-stack';

import { type MapControlType } from '../components';
import { MAP_PLUGIN } from '../meta';

const MAP_ACTION = `${MAP_PLUGIN}/action`;

export enum MapAction {
  CREATE = `${MAP_ACTION}/create`,
  TOGGLE = `${MAP_ACTION}/toggle`,
}

export type MapProvides = {};

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
  SchemaProvides &
  StackProvides;

export type MapMarker = {
  id: string;
  title?: string;
  location: LatLngLiteral;
};

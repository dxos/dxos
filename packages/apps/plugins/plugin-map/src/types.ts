//
// Copyright 2023 DXOS.org
//

import type {
  GraphBuilderProvides,
  IntentResolverProvides,
  TranslationsProvides,
  SurfaceProvides,
  MetadataRecordsProvides,
} from '@dxos/app-framework';
import { isTypedObject, type Expando, type TypedObject } from '@dxos/react-client/echo';

export const MAP_PLUGIN = 'dxos.org/plugin/map';

const MAP_ACTION = `${MAP_PLUGIN}/action`;

export enum MapAction {
  CREATE = `${MAP_ACTION}/create`,
}

export type MapProvides = {};

export type MapPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  MetadataRecordsProvides &
  TranslationsProvides;

export const isObject = (object: unknown): object is TypedObject => {
  return isTypedObject(object) && (object as Expando).type === 'map';
};

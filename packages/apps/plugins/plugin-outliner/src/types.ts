//
// Copyright 2023 DXOS.org
//

import type { StackProvides } from '@braneframe/plugin-stack';
import { Tree as TreeType } from '@braneframe/types';
import type {
  GraphBuilderProvides,
  IntentResolverProvides,
  TranslationsProvides,
  SurfaceProvides,
  MetadataRecordsProvides,
} from '@dxos/app-framework';
import { isTypedObject, type TypedObject } from '@dxos/react-client/echo';

import { OUTLINER_PLUGIN } from './meta';

const OUTLINER_ACTION = `${OUTLINER_PLUGIN}/action`;

export enum OutlinerAction {
  CREATE = `${OUTLINER_ACTION}/create`,
  TOGGLE_CHECKBOX = `${OUTLINER_ACTION}/toggle-checkbox`,
}

export type OutlinerPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  MetadataRecordsProvides &
  TranslationsProvides &
  StackProvides;

export const isObject = (object: unknown): object is TypedObject => {
  return isTypedObject(object) && TreeType.schema.typename === object.__typename;
};

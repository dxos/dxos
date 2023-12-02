//
// Copyright 2023 DXOS.org
//

import type { StackProvides } from '@braneframe/plugin-stack';
import { Chain as ChainType } from '@braneframe/types';
import type {
  GraphBuilderProvides,
  IntentResolverProvides,
  TranslationsProvides,
  SurfaceProvides,
  MetadataRecordsProvides,
} from '@dxos/app-framework';
import { isTypedObject, type TypedObject } from '@dxos/react-client/echo';

import { CHAIN_PLUGIN } from './meta';

const CHAIN_ACTION = `${CHAIN_PLUGIN}/action`;

export enum ChainAction {
  CREATE = `${CHAIN_ACTION}/create`
}

export type ChainPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  MetadataRecordsProvides &
  TranslationsProvides &
  StackProvides;

export const isObject = (object: unknown): object is TypedObject => {
  return isTypedObject(object) && ChainType.schema.typename === object.__typename;
};

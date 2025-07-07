//
// Copyright 2025 DXOS.org
//

import { type ResourceKey } from 'i18next';

import { Capabilities, contributes, createIntent, type PluginContext } from '@dxos/app-framework';
import { isSpace } from '@dxos/client/echo';
import { Obj, Type } from '@dxos/echo';
import { DataType } from '@dxos/schema';

import { SPACE_PLUGIN } from '../meta';
import { translations } from '../translations';
import { SPACE_TYPE, SpaceAction } from '../types';
import { SPACES } from '../util';

const COLLECTION_TYPE = Type.getTypename(DataType.Collection);

const getTranslation = (key: string) => translations[0]['en-US'][key] as Extract<ResourceKey, { [key: string]: any }>;

// https://stackoverflow.com/a/19016910
const DIRECTORY_TYPE = 'text/directory';

export default (context: PluginContext) =>
  contributes(Capabilities.AppGraphSerializer, [
    {
      inputType: SPACES,
      outputType: DIRECTORY_TYPE,
      serialize: (node) => ({
        name: getTranslation(SPACE_PLUGIN)['spaces label'],
        data: getTranslation(SPACE_PLUGIN)['spaces label'],
        type: DIRECTORY_TYPE,
      }),
      deserialize: () => {
        // No-op.
      },
    },
    {
      inputType: SPACE_TYPE,
      outputType: DIRECTORY_TYPE,
      serialize: (node) => ({
        name: node.data.properties.name ?? getTranslation(SPACE_PLUGIN)['unnamed space label'],
        data: node.data.properties.name ?? getTranslation(SPACE_PLUGIN)['unnamed space label'],
        type: DIRECTORY_TYPE,
      }),
      deserialize: async (data) => {
        const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
        const result = await dispatch(createIntent(SpaceAction.Create, { name: data.name, edgeReplication: true }));
        return result.data?.space;
      },
    },
    {
      inputType: COLLECTION_TYPE,
      outputType: DIRECTORY_TYPE,
      serialize: (node) => ({
        name: node.data.name ?? getTranslation(COLLECTION_TYPE)['object name placeholder'],
        data: node.data.name ?? getTranslation(COLLECTION_TYPE)['object name placeholder'],
        type: DIRECTORY_TYPE,
      }),
      deserialize: async (data, ancestors) => {
        const space = ancestors.find(isSpace);
        const collection =
          ancestors.findLast((ancestor) => Obj.instanceOf(DataType.Collection, ancestor)) ??
          space?.properties[COLLECTION_TYPE]?.target;
        if (!space || !collection) {
          return;
        }

        const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
        const result = await dispatch(
          createIntent(SpaceAction.AddObject, {
            target: collection,
            object: Obj.make(DataType.Collection, { name: data.name, objects: [] }),
          }),
        );

        return result.data?.object;
      },
    },
  ]);

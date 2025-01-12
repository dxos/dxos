//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createIntent, type PluginsContext } from '@dxos/app-framework';
import { isSpace } from '@dxos/client/echo';
import { create } from '@dxos/live-object';

import { SPACE_PLUGIN } from '../meta';
import translations from '../translations';
import { CollectionType, SpaceAction } from '../types';
import { SPACES, SPACE_TYPE } from '../util';

// https://stackoverflow.com/a/19016910
const DIRECTORY_TYPE = 'text/directory';

export default (context: PluginsContext) =>
  contributes(Capabilities.AppGraphSerializer, [
    {
      inputType: SPACES,
      outputType: DIRECTORY_TYPE,
      serialize: (node) => ({
        name: translations[0]['en-US'][SPACE_PLUGIN]['spaces label'],
        data: translations[0]['en-US'][SPACE_PLUGIN]['spaces label'],
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
        name: node.data.properties.name ?? translations[0]['en-US'][SPACE_PLUGIN]['unnamed space label'],
        data: node.data.properties.name ?? translations[0]['en-US'][SPACE_PLUGIN]['unnamed space label'],
        type: DIRECTORY_TYPE,
      }),
      deserialize: async (data) => {
        const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher);
        const result = await dispatch(createIntent(SpaceAction.Create, { name: data.name, edgeReplication: true }));
        return result.data?.space;
      },
    },
    {
      inputType: CollectionType.typename,
      outputType: DIRECTORY_TYPE,
      serialize: (node) => ({
        name: node.data.name ?? translations[0]['en-US'][SPACE_PLUGIN]['unnamed collection label'],
        data: node.data.name ?? translations[0]['en-US'][SPACE_PLUGIN]['unnamed collection label'],
        type: DIRECTORY_TYPE,
      }),
      deserialize: async (data, ancestors) => {
        const space = ancestors.find(isSpace);
        const collection =
          ancestors.findLast((ancestor) => ancestor instanceof CollectionType) ??
          space?.properties[CollectionType.typename]?.target;
        if (!space || !collection) {
          return;
        }

        const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher);
        const result = await dispatch(
          createIntent(SpaceAction.AddObject, {
            target: collection,
            object: create(CollectionType, { name: data.name, objects: [], views: {} }),
          }),
        );

        return result.data?.object;
      },
    },
  ]);

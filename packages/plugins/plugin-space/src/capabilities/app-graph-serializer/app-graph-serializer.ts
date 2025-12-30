//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import {
  Capability,
  Common,
  createIntent,
} from '@dxos/app-framework';
import { isSpace } from '@dxos/client/echo';
import { Obj } from '@dxos/echo';
import { Collection } from '@dxos/schema';

import { meta } from '../../meta';
import { translations } from '../../translations';
import { SPACE_TYPE, SpaceAction } from '../../types';
import { SPACES } from '../../util';

const COLLECTION_TYPE = Collection.Collection.typename;

// https://stackoverflow.com/a/19016910
const DIRECTORY_TYPE = 'text/directory';

export default Capability.makeModule((context) =>
  Effect.succeed(
    Capability.contributes(Common.Capability.AppGraphSerializer, [
    {
      inputType: SPACES,
      outputType: DIRECTORY_TYPE,
      serialize: (node) => ({
        name: translations[0]['en-US'][meta.id]['spaces label'] ?? 'Spaces',
        data: translations[0]['en-US'][meta.id]['spaces label'] ?? 'Spaces',
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
        name: node.data.properties.name ?? translations[0]['en-US'][meta.id]['unnamed space label'],
        data: node.data.properties.name ?? translations[0]['en-US'][meta.id]['unnamed space label'],
        type: DIRECTORY_TYPE,
      }),
      deserialize: async (data) => {
        const { dispatchPromise: dispatch } = context.getCapability(Common.Capability.IntentDispatcher);
        const result = await dispatch(createIntent(SpaceAction.Create, { name: data.name, edgeReplication: true }));
        return result.data?.space;
      },
    },
    {
      inputType: COLLECTION_TYPE,
      outputType: DIRECTORY_TYPE,
      serialize: (node) => ({
        name: node.data.name ?? translations[0]['en-US'][meta.id]['object name placeholder'],
        data: node.data.name ?? translations[0]['en-US'][meta.id]['object name placeholder'],
        type: DIRECTORY_TYPE,
      }),
      deserialize: async (data, ancestors) => {
        const space = ancestors.find(isSpace);
        const collection =
          ancestors.findLast((ancestor) => Obj.instanceOf(Collection.Collection, ancestor)) ??
          space?.properties[COLLECTION_TYPE]?.target;
        if (!space || !collection) {
          return;
        }

        const { dispatchPromise: dispatch } = context.getCapability(Common.Capability.IntentDispatcher);
        const result = await dispatch(
          createIntent(SpaceAction.AddObject, {
            target: collection,
            object: Obj.make(Collection.Collection, { name: data.name, objects: [] }),
          }),
        );

        return result.data?.object;
      },
    },
  ]),
  ),
);

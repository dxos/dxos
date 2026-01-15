//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { isSpace } from '@dxos/client/echo';
import { Obj } from '@dxos/echo';
import { Collection } from '@dxos/schema';

import { meta } from '../../meta';
import { translations } from '../../translations';
import { SPACE_TYPE, SpaceOperation } from '../../types';
import { SPACES } from '../../util';

const COLLECTION_TYPE = Collection.Collection.typename;

// https://stackoverflow.com/a/19016910
const DIRECTORY_TYPE = 'text/directory';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Get context for lazy capability access in callbacks.
    const context = yield* Capability.PluginContextService;

    return Capability.contributes(Common.Capability.AppGraphSerializer, [
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
          const { invokePromise } = context.getCapability(Common.Capability.OperationInvoker);
          const result = await invokePromise(SpaceOperation.Create, { name: data.name, edgeReplication: true });
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

          const { invokePromise } = context.getCapability(Common.Capability.OperationInvoker);
          const result = await invokePromise(SpaceOperation.AddObject, {
            target: collection,
            object: Obj.make(Collection.Collection, { name: data.name, objects: [] }),
          });

          return result.data?.object;
        },
      },
    ]);
  }),
);

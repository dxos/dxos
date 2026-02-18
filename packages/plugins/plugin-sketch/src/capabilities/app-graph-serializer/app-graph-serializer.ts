//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Obj } from '@dxos/echo';
import { SpaceOperation } from '@dxos/plugin-space/types';
import { isSpace } from '@dxos/react-client/echo';
import { Collection } from '@dxos/schema';

import { translations } from '../../translations';
import { Diagram, SketchOperation } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Get context for lazy capability access in callbacks.
    const capabilities = yield* Capability.Service;

    return Capability.contributes(AppCapabilities.AppGraphSerializer, [
      {
        inputType: Diagram.Diagram.typename,
        outputType: 'application/tldraw',
        // Reconcile with metadata serializers.
        serialize: async (node) => {
          const diagram = node.data;
          const canvas = await diagram.canvas.load();
          return {
            name: diagram.name || translations[0]['en-US'][Diagram.Diagram.typename]['object name placeholder'],
            data: JSON.stringify({ schema: canvas.Schema, content: canvas.content }),
            type: 'application/tldraw',
          };
        },
        deserialize: async (data, ancestors) => {
          const space = ancestors.find(isSpace);
          const target =
            ancestors.findLast((ancestor) => Obj.instanceOf(Collection.Collection, ancestor)) ??
            space?.properties[Collection.Collection.typename]?.target;
          if (!space || !target) {
            return;
          }

          const { schema, content } = JSON.parse(data.data);

          const { invokePromise } = capabilities.get(Capabilities.OperationInvoker);
          const createResult = await invokePromise(SketchOperation.Create, { name: data.name, schema, content });
          if (!createResult.data?.object) {
            return undefined;
          }
          await invokePromise(SpaceOperation.AddObject, { target, object: createResult.data.object });

          return createResult.data.object;
        },
      },
    ]);
  }),
);

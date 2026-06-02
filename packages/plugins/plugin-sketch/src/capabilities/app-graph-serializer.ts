//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities, RootCollectionAnnotation } from '@dxos/app-toolkit';
import { Annotation, Collection, Obj, Type } from '@dxos/echo';
import { SpaceOperation } from '@dxos/plugin-space';
import { isSpace } from '@dxos/react-client/echo';

import { translations } from '#translations';
import { SketchOperation } from '#types';
import { Sketch } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Get context for lazy capability access in callbacks.
    const capabilities = yield* Capability.Service;

    return Capability.contributes(AppCapabilities.AppGraphSerializer, [
      {
        inputType: Type.getTypename(Sketch.Sketch),
        outputType: 'application/tldraw',
        // Reconcile with metadata serializers.
        serialize: async (node) => {
          const sketch = node.data;
          const canvas = await sketch.canvas.load();
          return {
            name: sketch.name || translations[0]['en-US'][Type.getTypename(Sketch.Sketch)]['object-name.placeholder'],
            data: JSON.stringify({ schema: canvas.Schema, content: canvas.content }),
            type: 'application/tldraw',
          };
        },
        deserialize: async (data, ancestors) => {
          const space = ancestors.find(isSpace);
          const target =
            ancestors.findLast((ancestor) => Obj.instanceOf(Collection.Collection, ancestor)) ??
            (space && Annotation.get(space.properties, RootCollectionAnnotation).pipe(Option.getOrUndefined)?.target);
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

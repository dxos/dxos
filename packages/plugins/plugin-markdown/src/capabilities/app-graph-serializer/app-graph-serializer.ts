//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { SpaceOperation } from '@dxos/plugin-space/types';
import { isSpace } from '@dxos/react-client/echo';
import { Collection } from '@dxos/schema';

import { translations } from '../../translations';
import { Markdown, MarkdownOperation } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const { invokePromise } = yield* Capability.get(Common.Capability.OperationInvoker);

    return Capability.contributes(Common.Capability.AppGraphSerializer, [
      {
        inputType: Markdown.Document.typename,
        outputType: 'text/markdown',
        // Reconcile with metadata serializers.
        serialize: async (node) => {
          const doc = node.data;
          const content = await doc.content.load();
          return {
            name:
              doc.name ||
              doc.fallbackName ||
              translations[0]['en-US'][Markdown.Document.typename]['object name placeholder'],
            data: content.content,
            type: 'text/markdown',
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

          const createResult = await invokePromise(MarkdownOperation.Create, { name: data.name, content: data.data });
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

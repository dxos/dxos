//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, createIntent } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { SpaceAction } from '@dxos/plugin-space/types';
import { isSpace } from '@dxos/react-client/echo';
import { Collection } from '@dxos/schema';

import { translations } from '../../translations';
import { Markdown, MarkdownAction } from '../../types';

export default Capability.makeModule((context) =>
  Effect.succeed(
    Capability.contributes(Common.Capability.AppGraphSerializer, [
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

          const { dispatchPromise: dispatch } = context.getCapability(Common.Capability.IntentDispatcher);
          const createResult = await dispatch(
            createIntent(MarkdownAction.Create, { name: data.name, content: data.data }),
          );
          if (!createResult.data?.object) {
            return undefined;
          }
          await dispatch(createIntent(SpaceAction.AddObject, { target, object: createResult.data.object }));

          return createResult.data.object;
        },
      },
    ]),
  ),
);

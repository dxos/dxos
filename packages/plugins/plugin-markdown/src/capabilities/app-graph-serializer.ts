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
import { MarkdownOperation } from '#types';
import { Markdown } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Get context for lazy capability access in callbacks.
    const capabilities = yield* Capability.Service;

    return Capability.contributes(AppCapabilities.AppGraphSerializer, [
      {
        inputType: Type.getTypename(Markdown.Document),
        outputType: 'text/markdown',
        // Reconcile with metadata serializers.
        serialize: async (node) => {
          const doc = node.data;
          const content = await doc.content.load();
          return {
            name:
              doc.name ||
              doc.fallbackName ||
              translations[0]['en-US'][Type.getTypename(Markdown.Document)]['object-name.placeholder'],
            data: content.content,
            type: 'text/markdown',
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

          const { invokePromise } = capabilities.get(Capabilities.OperationInvoker);
          const createResult = await invokePromise(MarkdownOperation.CreateMarkdown, {
            name: data.name,
            content: data.data,
          });
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

//
// Copyright 2025 DXOS.org
//

import * as Function from 'effect/Function';

import {
  Capabilities,
  type PluginContext,
  chain,
  contributes,
  createIntent,
  defineCapabilityModule,
} from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { SpaceAction } from '@dxos/plugin-space/types';
import { isSpace } from '@dxos/react-client/echo';
import { Collection } from '@dxos/schema';

import { translations } from '../translations';
import { Markdown, MarkdownAction } from '../types';

export default defineCapabilityModule((context: PluginContext) =>
  contributes(Capabilities.AppGraphSerializer, [
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

        const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
        const result = await dispatch(
          Function.pipe(
            createIntent(MarkdownAction.Create, { name: data.name, content: data.data }),
            chain(SpaceAction.AddObject, { target }),
          ),
        );

        return result.data?.object;
      },
    },
  ]),
);

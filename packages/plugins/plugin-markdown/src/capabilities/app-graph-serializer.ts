//
// Copyright 2025 DXOS.org
//

import { pipe } from 'effect';

import { contributes, Capabilities, type PluginContext, chain, createIntent } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { SpaceAction } from '@dxos/plugin-space/types';
import { isSpace } from '@dxos/react-client/echo';
import { DataType } from '@dxos/schema';

import { translations } from '../translations';
import { MarkdownAction, Document } from '../types';

export default (context: PluginContext) =>
  contributes(Capabilities.AppGraphSerializer, [
    {
      inputType: Document.Document.typename,
      outputType: 'text/markdown',
      // Reconcile with metadata serializers.
      serialize: async (node) => {
        const doc = node.data;
        const content = await doc.content.load();
        return {
          name:
            doc.name ||
            doc.fallbackName ||
            translations[0]['en-US'][Document.Document.typename]['object name placeholder'],
          data: content.content,
          type: 'text/markdown',
        };
      },
      deserialize: async (data, ancestors) => {
        const space = ancestors.find(isSpace);
        const target =
          ancestors.findLast((ancestor) => Obj.instanceOf(DataType.Collection, ancestor)) ??
          space?.properties[DataType.Collection.typename]?.target;
        if (!space || !target) {
          return;
        }

        const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
        const result = await dispatch(
          pipe(
            createIntent(MarkdownAction.Create, { spaceId: space.id, name: data.name, content: data.data }),
            chain(SpaceAction.AddObject, { target }),
          ),
        );

        return result.data?.object;
      },
    },
  ]);

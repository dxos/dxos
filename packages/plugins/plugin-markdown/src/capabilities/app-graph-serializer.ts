//
// Copyright 2025 DXOS.org
//

import { pipe } from 'effect';

import { contributes, Capabilities, type PluginsContext, chain, createIntent } from '@dxos/app-framework';
import { SpaceAction, CollectionType } from '@dxos/plugin-space/types';
import { isSpace } from '@dxos/react-client/echo';

import { MARKDOWN_PLUGIN } from '../meta';
import translations from '../translations';
import { MarkdownAction, DocumentType } from '../types';

export default (context: PluginsContext) =>
  contributes(Capabilities.AppGraphSerializer, [
    {
      inputType: DocumentType.typename,
      outputType: 'text/markdown',
      // Reconcile with metadata serializers.
      serialize: async (node) => {
        const doc = node.data;
        const content = await doc.content.load();
        return {
          name: doc.name || doc.fallbackName || translations[0]['en-US'][MARKDOWN_PLUGIN]['document title placeholder'],
          data: content.content,
          type: 'text/markdown',
        };
      },
      deserialize: async (data, ancestors) => {
        const space = ancestors.find(isSpace);
        const target =
          ancestors.findLast((ancestor) => ancestor instanceof CollectionType) ??
          space?.properties[CollectionType.typename]?.target;
        if (!space || !target) {
          return;
        }

        const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher);
        const result = await dispatch(
          pipe(
            createIntent(MarkdownAction.Create, { name: data.name, content: data.data }),
            chain(SpaceAction.AddObject, { target }),
          ),
        );

        return result.data?.object;
      },
    },
  ]);

//
// Copyright 2025 DXOS.org
//

import { next as A } from '@automerge/automerge';

import {
  Capabilities,
  CollaborationActions,
  contributes,
  createResolver,
  type PluginContext,
} from '@dxos/app-framework';
import { createQueueDxn, isInstanceOf } from '@dxos/echo-schema';
import { makeRef, live, refFromDXN } from '@dxos/live-object';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client';
import { resolveRef } from '@dxos/react-client';
import { createDocAccessor } from '@dxos/react-client/echo';
import { DataType } from '@dxos/schema';

import { MarkdownCapabilities } from './capabilities';
import { DocumentType, MarkdownAction } from '../types';

export default (context: PluginContext) =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: MarkdownAction.Create,
      resolve: ({ name, spaceId, content }) => {
        const doc = live(DocumentType, {
          name,
          content: makeRef(live(DataType.Text, { content: content ?? '' })),
          assistantChatQueue: refFromDXN(createQueueDxn(spaceId)),
          threads: [],
        });

        return { data: { object: doc } };
      },
    }),
    createResolver({
      intent: MarkdownAction.SetViewMode,
      resolve: ({ id, viewMode }) => {
        const { state } = context.getCapability(MarkdownCapabilities.State);
        state.viewMode[id] = viewMode;
      },
    }),
    // TODO(burdon): What is the error boundary for intents? Are errors reported back to caller?
    createResolver({
      intent: CollaborationActions.InsertContent,
      resolve: async ({ spaceId, target: targetRef, object: objectRef, label }) => {
        const client = context.getCapability(ClientCapabilities.Client);
        const space = client.spaces.get(spaceId);
        const target = await resolveRef(client, targetRef.dxn, space);
        if (target && isInstanceOf(DocumentType, target)) {
          const accessor = createDocAccessor(target, ['content']);
          // TODO(burdon): Should be a cursor that references a selected position.
          const index = 0;
          accessor.handle.change((doc) => {
            // TODO(burdon): Throws error:
            // intent-dispatcher.ts:270 Cannot read properties of undefined (reading 'annotations') (FiberFailure) TypeError: Cannot read properties of undefined (reading 'annotations')
            const ref = `[${label ?? 'Generated content'}]](${objectRef.dxn.toString()})\n`;
            A.splice(doc, accessor.path.slice(), index, 0, ref);
          });
        } else {
          log.warn('target is not a document', { targetRef, objectRef });
        }
      },
    }),
  ]);

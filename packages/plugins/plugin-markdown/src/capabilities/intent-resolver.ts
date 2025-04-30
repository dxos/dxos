//
// Copyright 2025 DXOS.org
//

import {
  Capabilities,
  CollaborationActions,
  contributes,
  createResolver,
  type PluginsContext,
} from '@dxos/app-framework';
// import { next as A } from '@dxos/automerge/automerge';
import { ObjectId } from '@dxos/echo-schema';
import { DXN, QueueSubspaceTags } from '@dxos/keys';
import { makeRef, live, refFromDXN } from '@dxos/live-object';
import { ClientCapabilities } from '@dxos/plugin-client';
// import { createDocAccessor } from '@dxos/react-client/echo';
import { TextType } from '@dxos/schema';

import { MarkdownCapabilities } from './capabilities';
import { DocumentType, MarkdownAction } from '../types';
import { resolveRef } from '../types/util';

export default (context: PluginsContext) =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: MarkdownAction.Create,
      resolve: ({ name, spaceId, content }) => {
        const doc = live(DocumentType, {
          name,
          content: makeRef(live(TextType, { content: content ?? '' })),
          assistantChatQueue: refFromDXN(new DXN(DXN.kind.QUEUE, [QueueSubspaceTags.DATA, spaceId, ObjectId.random()])),
          threads: [],
        });

        return { data: { object: doc } };
      },
    }),
    createResolver({
      intent: MarkdownAction.SetViewMode,
      resolve: ({ id, viewMode }) => {
        const { state } = context.requestCapability(MarkdownCapabilities.State);
        state.viewMode[id] = viewMode;
      },
    }),
    // TODO(burdon): What is the error boundary for intents? Are errors reported back to caller?
    createResolver({
      intent: CollaborationActions.InsertContent,
      resolve: async ({ target: targetRef, object: objectRef, label }) => {
        const client = context.requestCapability(ClientCapabilities.Client);
        const object = await resolveRef(client, targetRef.dxn);

        console.log('!!!', object);

        // console.log('target', target, isInstanceOf(target as any, DocumentType));
        // if (isInstanceOf(target as any, DocumentType)) {
        //   return;
        // }

        // const client = context.requestCapability(ClientCapabilities.Client);
        // const message = getObject<MessageType>(client, messageRef.dxn);
        // console.log('target', message);

        // const accessor = createDocAccessor(target, ['content']);
        // accessor.handle.change((doc) => {
        //   A.splice(doc, accessor.path.slice(), 0, 0, 'xxx');
        // });

        // Load the document content and insert link.
        // const content = await document.content.load();
        // const proposalLink = `[${label ?? 'Generated content'}]](${queueId}#${messageId})\n`;
        // const accessor = createDocAccessor(content, ['content']);
        // accessor.handle.change((doc) => {
        //   // TODO(burdon): Insert at current cursor position.
        //   A.splice(doc, accessor.path.slice(), 0, 0, proposalLink);
        // });
      },
    }),
  ]);

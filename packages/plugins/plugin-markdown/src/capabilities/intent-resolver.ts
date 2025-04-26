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
import { next as A } from '@dxos/automerge/automerge';
import { ObjectId } from '@dxos/echo-schema';
import { DXN, QueueSubspaceTags } from '@dxos/keys';
import { makeRef, create, refFromDXN } from '@dxos/live-object';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client';
import { createDocAccessor, parseId } from '@dxos/react-client/echo';
import { TextType } from '@dxos/schema';

import { MarkdownCapabilities } from './capabilities';
import { DocumentType, MarkdownAction } from '../types';

// Import AssistantAction from plugin-assistant

export default (context: PluginsContext) =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: MarkdownAction.Create,
      resolve: ({ name, spaceId, content }) => {
        const doc = create(DocumentType, {
          name,
          content: makeRef(create(TextType, { content: content ?? '' })),
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
    createResolver({
      intent: CollaborationActions.ContentProposal,
      resolve: async ({ queueId, messageId, associatedArtifact }) => {
        // Get the document from the associatedArtifact.
        // Only handle markdown documents.
        const { id, typename } = associatedArtifact;
        log.info('processing proposal', { queueId, messageId, associatedArtifact, id, typename });
        if (typename !== DocumentType.typename) {
          log.warn('not a markdown document', { id, typename });
          return;
        }

        const client = context.requestCapability(ClientCapabilities.Client);
        const layout = context.requestCapability(Capabilities.Layout);
        const { spaceId } = parseId(layout.workspace);
        const space = spaceId ? client.spaces.get(spaceId) : null;

        let document;
        if (space) {
          document = await space.db.query({ id }).first();
        }
        if (!document) {
          log.warn('document not found', { id });
          return;
        }

        // Load the document content.
        const content = await document.content.load();

        // TODO(burdon): Get prompt for link name.
        // Format the link with the proposal protocol.
        const proposalLink = `\n\n[View proposal](proposal://${queueId}#${messageId})`;
        const accessor = createDocAccessor(content, ['content']);
        accessor.handle.change((doc) => {
          log.info('insert', { proposalLink });
          A.splice(doc, accessor.path.slice(), 0, 0, proposalLink);
        });

        log.info('done');
      },
    }),
  ]);

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
import { makeRef, live, refFromDXN } from '@dxos/live-object';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client';
import { createDocAccessor, parseFullyQualifiedId } from '@dxos/react-client/echo';
import { TextType } from '@dxos/schema';

import { MarkdownCapabilities } from './capabilities';
import { DocumentType, MarkdownAction } from '../types';

// Import AssistantAction from plugin-assistant

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
      resolve: async ({ label, queueId, messageId, associatedArtifact }) => {
        const client = context.requestCapability(ClientCapabilities.Client);

        // Only handle markdown documents.
        const { id, typename, spaceId } = associatedArtifact;
        log.info('processing proposal', { queueId, messageId, associatedArtifact });
        if (typename !== DocumentType.typename) {
          log.warn('invalid object type', { associatedArtifact });
          return;
        }

        // Get the document from the associatedArtifact.
        let document;
        const space = spaceId ? client.spaces.get(spaceId) : null;
        if (space) {
          const [objectSpaceId, objectId] = parseFullyQualifiedId(id);
          if (objectSpaceId !== spaceId) {
            log.warn('invalid space', { spaceId, associatedArtifact });
            return;
          }

          document = await space.db.query({ id: objectId }).first();
        }
        if (!document) {
          log.warn('document not found', { associatedArtifact });
          return;
        }

        // Load the document content and insert link.
        const content = await document.content.load();
        const proposalLink = `[${label ?? 'Generated content'}]](${queueId}#${messageId})\n`;
        const accessor = createDocAccessor(content, ['content']);
        accessor.handle.change((doc) => {
          // TODO(burdon): Insert at current cursor position.
          A.splice(doc, accessor.path.slice(), 0, 0, proposalLink);
        });
      },
    }),
  ]);

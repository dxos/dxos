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
import { ObjectId } from '@dxos/echo-schema';
import { DXN, QueueSubspaceTags } from '@dxos/keys';
import { makeRef, create, refFromDXN } from '@dxos/live-object';
import { ClientCapabilities } from '@dxos/plugin-client';
import { parseId } from '@dxos/react-client/echo';
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
      resolve: async ({ dxn, blockIndex, associatedArtifact }) => {
        // Get the document from the associatedArtifact
        const { id, typename } = associatedArtifact;

        // Only handle markdown documents
        if (typename !== DocumentType.typename) {
          return;
        }

        // Find the document in all spaces
        let document;

        const layout = context.requestCapability(Capabilities.Layout);
        const client = context.requestCapability(ClientCapabilities.Client);
        const { spaceId } = parseId(layout.workspace);
        const space = spaceId ? client.spaces.get(spaceId) : null;

        if (space) {
          document = await space.db.query({ id }).first();
        }

        if (!document) {
          return;
        }

        // Load the document content
        const content = await document.content.load();

        // Format the link with the proposal protocol
        const proposalLink = `\n\n[View proposal](proposal:${dxn}#${blockIndex})`;

        // Append the link to the document content
        document.content = content + proposalLink;
      },
    }),
  ]);

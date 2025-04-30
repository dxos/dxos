//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createResolver, type PluginsContext } from '@dxos/app-framework';
import { AIServiceEdgeClient } from '@dxos/assistant';
import { getSchemaTypename, isInstanceOf } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { create, makeRef } from '@dxos/live-object';
import { ClientCapabilities } from '@dxos/plugin-client';
import { DocumentType } from '@dxos/plugin-markdown/types';
import { TextType } from '@dxos/schema';

import { getMeetingContent, summarizeTranscript } from '../summarize';
import { MeetingAction, MeetingType } from '../types';

export default (context: PluginsContext) =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: MeetingAction.Create,
      resolve: ({ name }) => {
        const meeting = create(MeetingType, {
          name,
          created: new Date().toISOString(),
          participants: [],
          artifacts: {},
        });

        return { data: { object: meeting } };
      },
    }),
    createResolver({
      intent: MeetingAction.Summarize,
      resolve: async ({ meeting }) => {
        const client = context.requestCapability(ClientCapabilities.Client);
        const endpoint = client.config.values.runtime?.services?.ai?.server;
        invariant(endpoint, 'AI service not configured.');
        // TODO(wittjosiah): Use capability (but note that this creates a dependency on the assistant plugin being available for summarization to work).
        const ai = new AIServiceEdgeClient({ endpoint });
        const resolve = (typename: string) =>
          context.requestCapabilities(Capabilities.Metadata).find(({ id }) => id === typename)?.metadata ?? {};

        const typename = getSchemaTypename(DocumentType)!;
        let doc = (await meeting.artifacts[typename]?.load()) as DocumentType;
        let text = await doc?.content?.load();
        if (!isInstanceOf(DocumentType, doc)) {
          text = create(TextType, { content: '' });
          doc = create(DocumentType, { content: makeRef(text), threads: [] });
          meeting.artifacts[getSchemaTypename(DocumentType)!] = makeRef(doc);
        }

        const content = await getMeetingContent(meeting, resolve);
        text.content = 'Generating summary...';
        const summary = await summarizeTranscript(ai, content);
        text.content = summary;

        return { data: { object: doc } };
      },
    }),
  ]);

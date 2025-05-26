//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createResolver, type PluginContext } from '@dxos/app-framework';
import { AIServiceEdgeClient } from '@dxos/assistant';
import { getSchemaTypename, isInstanceOf } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { live, makeRef } from '@dxos/live-object';
import { ClientCapabilities } from '@dxos/plugin-client';
import { DocumentType } from '@dxos/plugin-markdown/types';
import { DataType } from '@dxos/schema';

import { getMeetingContent, summarizeTranscript } from '../summarize';
import { MeetingAction, MeetingType } from '../types';

export default (context: PluginContext) =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: MeetingAction.Create,
      resolve: ({ name, channel }) => {
        const meeting = live(MeetingType, {
          name,
          created: new Date().toISOString(),
          channel: makeRef(channel),
          participants: [],
          artifacts: {},
        });

        return { data: { object: meeting } };
      },
    }),
    // createResolver({
    //   intent: MeetingAction.FindOrCreate,
    //   resolve: ({ object: channel }) =>
    //     Effect.gen(function* () {
    //       const space = getSpace(channel);
    //       invariant(space, 'Space not found.');
    //       try {
    //         const meeting = yield*  space?.db.query(Filter.schema(MeetingType, { channel })).first();
    //         return { data: { object: meeting } };
    //       } catch {
    //         const { dispatch } = context.requestCapability(Capabilities.IntentDispatcher);
    //         const { object } = yield* dispatch(createIntent(MeetingAction.Create, { channel }));
    //         yield* dispatch(createIntent(SpaceAction.AddObject, { object, target: space, hidden: true }));
    //         return { data: { object } };
    //       }
    //     }),
    // }),
    createResolver({
      intent: MeetingAction.Summarize,
      resolve: async ({ meeting }) => {
        const client = context.getCapability(ClientCapabilities.Client);
        const endpoint = client.config.values.runtime?.services?.ai?.server;
        invariant(endpoint, 'AI service not configured.');
        // TODO(wittjosiah): Use capability (but note that this creates a dependency on the assistant plugin being available for summarization to work).
        const ai = new AIServiceEdgeClient({ endpoint });
        const resolve = (typename: string) =>
          context.getCapabilities(Capabilities.Metadata).find(({ id }) => id === typename)?.metadata ?? {};

        const typename = getSchemaTypename(DocumentType)!;
        let doc = (await meeting.artifacts[typename]?.load()) as DocumentType;
        let text = await doc?.content?.load();
        if (!isInstanceOf(DocumentType, doc)) {
          text = live(DataType.Text, { content: '' });
          doc = live(DocumentType, { content: makeRef(text), threads: [] });
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

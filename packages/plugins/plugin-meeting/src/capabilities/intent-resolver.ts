//
// Copyright 2025 DXOS.org
//

import { Effect } from 'effect';

import { Capabilities, contributes, createIntent, createResolver, type PluginContext } from '@dxos/app-framework';
import { AIServiceEdgeClient } from '@dxos/assistant';
import { Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { live } from '@dxos/live-object';
import { ClientCapabilities } from '@dxos/plugin-client';
import { ThreadAction } from '@dxos/plugin-thread/types';
import { TranscriptionAction } from '@dxos/plugin-transcription/types';
import { getSpace } from '@dxos/react-client/echo';
import { DataType } from '@dxos/schema';

import { MeetingCapabilities } from './capabilities';
import { getMeetingContent, summarizeTranscript } from '../summarize';
import { MeetingAction, MeetingType } from '../types';

export default (context: PluginContext) =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: MeetingAction.Create,
      resolve: ({ name, channel }) =>
        Effect.gen(function* () {
          const { dispatch } = context.getCapability(Capabilities.IntentDispatcher);
          const space = getSpace(channel);
          invariant(space);
          const { object: transcript } = yield* dispatch(
            createIntent(TranscriptionAction.Create, { spaceId: space.id }),
          );
          const { object: thread } = yield* dispatch(createIntent(ThreadAction.CreateChannelThread, { channel }));
          const meeting = live(MeetingType, {
            name,
            created: new Date().toISOString(),
            participants: [],
            transcript: Ref.make(transcript),
            notes: Ref.make(live(DataType.Text, { content: '' })),
            summary: Ref.make(live(DataType.Text, { content: '' })),
            thread: Ref.make(thread),
          });

          return { data: { object: meeting } };
        }),
    }),
    createResolver({
      intent: MeetingAction.SetActive,
      resolve: ({ object }) => {
        const state = context.getCapability(MeetingCapabilities.State);
        state.activeMeeting = object;
        return { data: { object } };
      },
    }),
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

        const text = await meeting.summary.load();
        text.content = 'Generating summary...';
        const content = await getMeetingContent(meeting, resolve);
        const summary = await summarizeTranscript(ai, content);
        text.content = summary;
      },
    }),
  ]);

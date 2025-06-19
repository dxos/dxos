//
// Copyright 2025 DXOS.org
//

import { Effect } from 'effect';

import { AIServiceEdgeClient } from '@dxos/ai';
import { Capabilities, contributes, createIntent, createResolver, type PluginContext } from '@dxos/app-framework';
import { Ref, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { live } from '@dxos/live-object';
import { ClientCapabilities } from '@dxos/plugin-client';
import { ThreadCapabilities } from '@dxos/plugin-thread';
import { ThreadAction } from '@dxos/plugin-thread/types';
import { TranscriptionAction } from '@dxos/plugin-transcription/types';
import { Filter, fullyQualifiedId, getSpace, parseId, Query } from '@dxos/react-client/echo';
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
        const callManager = context.getCapability(ThreadCapabilities.CallManager);
        const state = context.getCapability(MeetingCapabilities.State);
        state.activeMeeting = object;
        callManager.setActivity(Type.getTypename(MeetingType)!, { meetingId: fullyQualifiedId(object) });
        return { data: { object } };
      },
    }),
    createResolver({
      intent: MeetingAction.HandlePayload,
      resolve: async ({ meetingId, transcriptDxn, transcriptionEnabled }) => {
        const client = context.getCapability(ClientCapabilities.Client);
        const state = context.getCapability(MeetingCapabilities.State);

        const { spaceId, objectId } = meetingId ? parseId(meetingId) : {};
        const space = spaceId && client.spaces.get(spaceId);
        const meeting = objectId && (await space?.db.query(Query.select(Filter.ids(objectId))).first());
        state.activeMeeting = meeting;

        const enabled = !!transcriptionEnabled;
        if (space && transcriptDxn) {
          // NOTE: Must set queue before enabling transcription.
          const queue = space.queues.get<DataType.Message>(Type.DXN.parse(transcriptDxn));
          state.transcriptionManager?.setQueue(queue);
        }
        await state.transcriptionManager?.setEnabled(enabled);
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

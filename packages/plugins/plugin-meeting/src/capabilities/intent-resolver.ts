//
// Copyright 2025 DXOS.org
//

import { Effect, Layer } from 'effect';

import { AiService } from '@dxos/ai';
import { Capabilities, type PluginContext, contributes, createIntent, createResolver } from '@dxos/app-framework';
import { Obj, Ref, Type } from '@dxos/echo';
import { LocalFunctionExecutionService } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { ClientCapabilities } from '@dxos/plugin-client';
import { ThreadCapabilities } from '@dxos/plugin-thread';
import { ThreadAction } from '@dxos/plugin-thread/types';
import { TranscriptActions } from '@dxos/plugin-transcription/types';
import { Filter, Query, fullyQualifiedId, getSpace, parseId } from '@dxos/react-client/echo';
import { DataType } from '@dxos/schema';

import { MeetingAction, MeetingType } from '../types';

import { MeetingCapabilities } from './capabilities';

export default (context: PluginContext) =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: MeetingAction.Create,
      resolve: ({ name, channel }) =>
        Effect.gen(function* () {
          const { dispatch } = context.getCapability(Capabilities.IntentDispatcher);
          const space = getSpace(channel);
          invariant(space);
          const { object: transcript } = yield* dispatch(createIntent(TranscriptActions.Create, { spaceId: space.id }));
          const { object: thread } = yield* dispatch(createIntent(ThreadAction.CreateChannelThread, { channel }));
          const meeting = Obj.make(MeetingType, {
            name,
            created: new Date().toISOString(),
            participants: [],
            transcript: Ref.make(transcript),
            notes: Ref.make(DataType.makeText()),
            summary: Ref.make(DataType.makeText()),
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
        Effect.gen(function* () {
          const functions =
            context
              .getCapabilities(Capabilities.Functions)
              .find((funcs) => funcs.some((func) => func.name.startsWith('dxos.org/function/transcription/'))) ?? [];
          const open = functions.find((func) => func.name === 'dxos.org/function/transcription/open');
          const summarize = functions.find((func) => func.name === 'dxos.org/function/transcription/summarize');
          invariant(open && summarize, 'Transcription functions not found');

          const transcript = yield* Effect.promise(() => meeting.transcript.load());
          const transcriptContent = yield* LocalFunctionExecutionService.invokeFunction(open, {
            id: fullyQualifiedId(transcript),
          });
          const notes = yield* Effect.promise(() => meeting.notes.load());
          const summary = yield* LocalFunctionExecutionService.invokeFunction(summarize, {
            transcript: transcriptContent.content,
            notes: notes.content,
          });
          const text = yield* Effect.promise(() => meeting.summary.load());
          text.content = summary;
        }).pipe(
          Effect.provide(
            Layer.mergeAll(
              AiService.model('@anthropic/claude-opus-4-0'), //
              LocalFunctionExecutionService.layer,
            ),
          ),
          Effect.runPromise,
        );
      },
    }),
  ]);

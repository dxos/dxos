//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { DXN, Obj, Ref, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Operation, OperationResolver } from '@dxos/operation';
import { ClientCapabilities } from '@dxos/plugin-client';
import { ThreadCapabilities } from '@dxos/plugin-thread';
import { ThreadOperation } from '@dxos/plugin-thread/types';
import { TranscriptOperation } from '@dxos/plugin-transcription/types';
import { Filter, Query, getSpace, parseId } from '@dxos/react-client/echo';
import { Collection, Text } from '@dxos/schema';
import { type Message } from '@dxos/types';

import { Meeting, MeetingCapabilities, MeetingOperation } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const context = yield* Capability.PluginContextService;
    // These are accessed eagerly because they're used in sync handlers or need consistent references
    const callManager = yield* Capability.get(ThreadCapabilities.CallManager);
    const state = yield* Capability.get(MeetingCapabilities.State);

    return Capability.contributes(Common.Capability.OperationResolver, [
      OperationResolver.make({
        operation: MeetingOperation.OnCreateSpace,
        handler: ({ isDefault, rootCollection }) =>
          Effect.gen(function* () {
            if (isDefault) {
              return;
            }

            const meetingCollection = Collection.makeManaged({ key: Type.getTypename(Meeting.Meeting) });
            rootCollection.objects.push(Ref.make(meetingCollection));
          }),
      }),
      OperationResolver.make({
        operation: MeetingOperation.Create,
        handler: ({ name, channel }) =>
          Effect.gen(function* () {
            const space = getSpace(channel);
            invariant(space);
            const { object: transcript } = yield* Operation.invoke(TranscriptOperation.Create, { space });
            const { object: thread } = yield* Operation.invoke(ThreadOperation.CreateChannelThread, { channel });
            const meeting = Obj.make(Meeting.Meeting, {
              name,
              created: new Date().toISOString(),
              participants: [],
              transcript: Ref.make(transcript),
              notes: Ref.make(Text.make()),
              summary: Ref.make(Text.make()),
              thread: Ref.make(thread),
            });

            return { object: meeting };
          }),
      }),
      OperationResolver.make({
        operation: MeetingOperation.SetActive,
        handler: ({ object }) =>
          Effect.sync(() => {
            state.activeMeeting = object;
            callManager.setActivity(Type.getTypename(Meeting.Meeting)!, {
              meetingId: object ? Obj.getDXN(object).toString() : '',
            });
            return { object };
          }),
      }),
      OperationResolver.make({
        operation: MeetingOperation.HandlePayload,
        handler: ({ meetingId, transcriptDxn, transcriptionEnabled }) =>
          Effect.gen(function* () {
            const client = yield* Capability.get(ClientCapabilities.Client);
            const { spaceId, objectId } = meetingId ? parseId(meetingId) : {};
            const space = spaceId && client.spaces.get(spaceId);
            const meeting =
              objectId && space
                ? yield* Effect.promise(() => space.db.query(Query.select(Filter.id(objectId))).first())
                : undefined;
            state.activeMeeting = meeting as Meeting.Meeting | undefined;

            const enabled = !!transcriptionEnabled;
            if (space && transcriptDxn) {
              // NOTE: Must set queue before enabling transcription.
              const queue = space.queues.get<Message.Message>(DXN.parse(transcriptDxn));
              state.transcriptionManager?.setQueue(queue);
            }

            if (state.transcriptionManager) {
              yield* Effect.promise(() => state.transcriptionManager!.setEnabled(enabled));
            }
          }).pipe(Effect.provideService(Capability.PluginContextService, context)),
      }),
      OperationResolver.make({
        operation: MeetingOperation.Summarize,
        handler: () => Effect.fail(new Error('Not implemented')),
      }),
    ]);
  }),
);

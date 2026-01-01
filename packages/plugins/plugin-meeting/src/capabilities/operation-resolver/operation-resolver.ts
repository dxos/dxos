//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, OperationResolver } from '@dxos/app-framework';
import { DXN, Obj, Ref, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { ClientCapabilities } from '@dxos/plugin-client';
import { ThreadCapabilities } from '@dxos/plugin-thread';
import { ThreadOperation } from '@dxos/plugin-thread/types';
import { TranscriptOperation } from '@dxos/plugin-transcription/types';
import { Filter, Query, getSpace, parseId } from '@dxos/react-client/echo';
import { Collection, Text } from '@dxos/schema';
import { type Message } from '@dxos/types';

import { Meeting, MeetingCapabilities, MeetingOperation } from '../../types';

export default Capability.makeModule((context) =>
  Effect.succeed(
    Capability.contributes(Common.Capability.OperationResolver, [
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
            const { invoke } = context.getCapability(Common.Capability.OperationInvoker);
            const space = getSpace(channel);
            invariant(space);
            const { object: transcript } = yield* invoke(TranscriptOperation.Create, { space });
            const { object: thread } = yield* invoke(ThreadOperation.CreateChannelThread, { channel });
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
            const callManager = context.getCapability(ThreadCapabilities.CallManager);
            const state = context.getCapability(MeetingCapabilities.State);
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
            const client = context.getCapability(ClientCapabilities.Client);
            const state = context.getCapability(MeetingCapabilities.State);

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
          }),
      }),
      OperationResolver.make({
        operation: MeetingOperation.Summarize,
        handler: () => Effect.fail(new Error('Not implemented')),
      }),
    ]),
  ),
);

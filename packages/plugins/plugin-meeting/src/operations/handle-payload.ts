// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Filter, Obj, Query } from '@dxos/echo';
import { EID } from '@dxos/keys';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { Meeting, MeetingCapabilities, MeetingOperation } from '#types';

const handler: Operation.WithHandler<typeof MeetingOperation.HandlePayload> = MeetingOperation.HandlePayload.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ meetingId }) {
      const client = yield* Capability.get(ClientCapabilities.Client);
      const store = yield* Capability.get(MeetingCapabilities.State);
      // The id is the meeting's absolute URI (`SetActive`), which names the space as well as the object.
      const uri = meetingId ? EID.tryParse(meetingId) : undefined;
      const spaceId = uri && EID.getSpaceId(uri);
      const objectId = uri && EID.getEntityId(uri);
      const space = spaceId && client.spaces.get(spaceId);
      // A meeting that has not replicated here yet resolves to none, and its transcript is then not written.
      const meeting =
        objectId && space
          ? yield* Effect.promise(() => space.db.query(Query.select(Filter.id(objectId))).firstOrUndefined())
          : undefined;
      store.updateState((current) => ({
        ...current,
        activeMeeting: meeting && Obj.instanceOf(Meeting.Meeting, meeting) ? meeting : undefined,
      }));
    }),
  ),
);

export default handler;

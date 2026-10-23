// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Feed, Filter, Obj, Query } from '@dxos/echo';
import { EID, parseId } from '@dxos/keys';
import * as CallsCapabilities from '@dxos/plugin-calls/CallsCapabilities';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { Meeting, MeetingCapabilities, MeetingOperation } from '#types';

const handler: Operation.WithHandler<typeof MeetingOperation.HandlePayload> = MeetingOperation.HandlePayload.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ meetingId, transcriptDxn, transcriptionEnabled }) {
      const client = yield* Capability.get(ClientCapabilities.Client);
      const store = yield* Capability.get(MeetingCapabilities.State);
      const callManager = yield* Capability.get(CallsCapabilities.Manager);
      const { spaceId, objectId } = meetingId ? parseId(meetingId) : {};
      const space = spaceId && client.spaces.get(spaceId);
      const meeting =
        objectId && space
          ? yield* Effect.promise(() => space.db.query(Query.select(Filter.id(objectId))).first())
          : undefined;
      store.updateState((current) => ({
        ...current,
        activeMeeting: meeting as Meeting.Meeting | undefined,
      }));

      if (space && transcriptDxn) {
        // Resolve the feed object from its queue/echo URI.
        const echoUri = EID.tryParse(transcriptDxn);
        const feedObjectId = echoUri ? EID.getEntityId(echoUri) : undefined;
        const feed = feedObjectId
          ? yield* Effect.promise(() => space.db.query(Query.select(Filter.id(feedObjectId))).first())
          : undefined;
        if (feed && Obj.instanceOf(Feed.Feed, feed)) {
          callManager.setTranscriptFeed(space.db, feed);
        }
      }

      // The activity is last-write-wins, so a payload without the flag (e.g. a bare meeting selection) must not turn
      // transcription off for the whole meeting.
      if (transcriptionEnabled !== undefined) {
        callManager.setTranscriptionEnabled(!!transcriptionEnabled);
      }
    }),
  ),
);

export default handler;

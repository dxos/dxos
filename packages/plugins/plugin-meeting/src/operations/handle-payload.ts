// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Feed, Filter, Obj, Query } from '@dxos/echo';
import { EID, parseId } from '@dxos/keys';
import { ClientCapabilities } from '@dxos/plugin-client';

import * as Meeting from '../types/Meeting';
import * as MeetingCapabilities from '../types/MeetingCapabilities';
import * as MeetingOperation from '../types/MeetingOperation';

const handler: Operation.WithHandler<typeof MeetingOperation.HandlePayload> = MeetingOperation.HandlePayload.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ meetingId, transcriptDxn, transcriptionEnabled }) {
      const client = yield* Capability.get(ClientCapabilities.Client);
      const store = yield* Capability.get(MeetingCapabilities.State);
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

      const enabled = !!transcriptionEnabled;
      const { transcriptionManager } = store.state;
      if (space && transcriptDxn && transcriptionManager) {
        // Resolve the feed object from its queue/echo URI.
        const echoUri = EID.tryParse(transcriptDxn);
        const feedObjectId = echoUri ? EID.getEntityId(echoUri) : undefined;
        const feed = feedObjectId
          ? yield* Effect.promise(() => space.db.query(Query.select(Filter.id(feedObjectId))).first())
          : undefined;
        if (feed && Obj.instanceOf(Feed.Feed, feed)) {
          transcriptionManager.setFeed(space, feed);
        }
      }

      if (transcriptionManager) {
        yield* Effect.promise(() => transcriptionManager.setEnabled(enabled));
      }
    }),
  ),
);

export default handler;

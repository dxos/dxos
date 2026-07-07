// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Feed, Filter, Obj, Query } from '@dxos/echo';
import { EID, parseId } from '@dxos/keys';
import { CallsCapabilities } from '@dxos/plugin-calls/types';
import { ClientCapabilities } from '@dxos/plugin-client';
import { TranscriptionCapabilities } from '@dxos/plugin-transcription/types';

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
          callManager.setTranscriptFeed(space, feed);

          // Advertise the feed so the standalone TranscriptionArticle suppresses its local recorder while
          // this meeting writes native segments to the same feed. Cleared on leave via `transcriptFeedUri`.
          const feedUri = Obj.getURI(feed);
          if (store.state.transcriptFeedUri !== feedUri) {
            const registry = yield* Capability.get(Capabilities.AtomRegistry);
            const managedFeeds = yield* Capability.get(TranscriptionCapabilities.ManagedFeeds);
            const next = new Set(registry.get(managedFeeds));
            store.state.transcriptFeedUri && next.delete(store.state.transcriptFeedUri);
            next.add(feedUri);
            registry.set(managedFeeds, next);
            store.updateState((current) => ({ ...current, transcriptFeedUri: feedUri }));
          }
        }
      }

      callManager.setTranscriptionEnabled(!!transcriptionEnabled);
    }),
  ),
);

export default handler;

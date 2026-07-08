// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Feed, Filter, Obj, Query, Type } from '@dxos/echo';
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

      if (space && meetingId && transcriptDxn) {
        // Resolve the feed object from its queue/echo URI.
        const echoUri = EID.tryParse(transcriptDxn);
        const feedObjectId = echoUri ? EID.getEntityId(echoUri) : undefined;
        const feed = feedObjectId
          ? yield* Effect.promise(() => space.db.query(Query.select(Filter.id(feedObjectId))).first())
          : undefined;
        if (feed && Obj.instanceOf(Feed.Feed, feed)) {
          callManager.setTranscriptFeed(space, feed);

          const registry = yield* Capability.get(Capabilities.AtomRegistry);
          const managedFeeds = yield* Capability.get(TranscriptionCapabilities.ManagedFeeds);
          const feedUri = Obj.getURI(feed);
          // A payload without the flag (e.g. a bare meeting re-selection) reflects the current state.
          const enabled =
            transcriptionEnabled !== undefined
              ? !!transcriptionEnabled
              : registry.get(callManager.transcriptionEnabledAtom);

          // Advertise the feed with a meeting-wide control: the TranscriptionArticle suppresses its
          // local recorder for it and drives its toolbar toggle off the call state instead. Cleared on
          // leave via `transcriptFeedUri`.
          const existing = registry.get(managedFeeds).get(feedUri);
          if (!existing || existing.enabled !== enabled) {
            const next = new Map(registry.get(managedFeeds));
            if (store.state.transcriptFeedUri && store.state.transcriptFeedUri !== feedUri) {
              next.delete(store.state.transcriptFeedUri);
            }
            next.set(feedUri, {
              enabled,
              // Broadcasts the full payload — the activity is one LWW value (see `set-active`), so a
              // partial write would drop the sibling fields for every peer.
              toggle: () => {
                const current = registry.get(callManager.transcriptionEnabledAtom);
                callManager.setActivity(Type.getTypename(Meeting.Meeting)!, {
                  meetingId,
                  transcriptDxn,
                  transcriptionEnabled: !current,
                });
              },
            });
            registry.set(managedFeeds, next);
          }
          if (store.state.transcriptFeedUri !== feedUri) {
            store.updateState((current) => ({ ...current, transcriptFeedUri: feedUri }));
          }
        }
      }

      // A payload without the field must not flip the state: the activity is last-write-wins and a
      // partial writer (e.g. `set-active`) would otherwise turn transcription off meeting-wide.
      if (transcriptionEnabled !== undefined) {
        callManager.setTranscriptionEnabled(!!transcriptionEnabled);
      }
    }),
  ),
);

export default handler;

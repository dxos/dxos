// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Feed, Filter, Obj, Query } from '@dxos/echo';
import { EID, parseId } from '@dxos/keys';
import { ClientCapabilities } from '@dxos/plugin-client';

import { Call, CallOperation, CallsCapabilities } from '#types';

const handler: Operation.WithHandler<typeof CallOperation.HandlePayload> = CallOperation.HandlePayload.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ meetingId, transcriptDXN, transcriptionEnabled }) {
      const client = yield* Capability.get(ClientCapabilities.Client);
      const store = yield* Capability.get(CallsCapabilities.RecordState);
      const { spaceId, objectId } = meetingId ? parseId(meetingId) : {};
      const space = spaceId && client.spaces.get(spaceId);
      const call =
        objectId && space
          ? yield* Effect.promise(() => space.db.query(Query.select(Filter.id(objectId))).first())
          : undefined;
      store.updateState((current) => ({
        ...current,
        // Query returns an untyped object; the id-based lookup guarantees a Call.
        activeCall: call as Call.Call | undefined,
      }));

      const enabled = !!transcriptionEnabled;
      const { transcriptionManager } = store.state;
      if (space && transcriptDXN && transcriptionManager) {
        // Resolve the feed object from its queue/echo URI.
        const echoUri = EID.tryParse(transcriptDXN);
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

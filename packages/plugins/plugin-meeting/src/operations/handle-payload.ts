// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { DXN, Filter, Query } from '@dxos/echo';
import { parseId } from '@dxos/keys';
import { ClientCapabilities } from '@dxos/plugin-client';

import { Meeting, MeetingCapabilities, MeetingOperation } from '../types';

const handler: Operation.WithHandler<typeof MeetingOperation.HandlePayload> = MeetingOperation.HandlePayload.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ meetingId, transcriptDXN, transcriptionEnabled }) {
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
      if (space && transcriptDXN && transcriptionManager) {
        transcriptionManager.setFeed(space, DXN.parse(transcriptDXN));
      }

      if (transcriptionManager) {
        yield* Effect.promise(() => transcriptionManager.setEnabled(enabled));
      }
    }),
  ),
);

export default handler;

// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { DXN } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { ClientCapabilities } from '@dxos/plugin-client';
import { Filter, Query, parseId } from '@dxos/react-client/echo';
import { type Message } from '@dxos/types';

import { HandlePayload } from './definitions';

import { Meeting, MeetingCapabilities } from '../types';

const handler: Operation.WithHandler<typeof HandlePayload> = HandlePayload.pipe(
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
      if (space && transcriptDxn) {
        const queue = space.queues.get<Message.Message>(DXN.parse(transcriptDxn));
        transcriptionManager?.setQueue(queue);
      }

      if (transcriptionManager) {
        yield* Effect.promise(() => transcriptionManager.setEnabled(enabled));
      }
    }),
  ),
);

export default handler;

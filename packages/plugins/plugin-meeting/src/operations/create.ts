// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { TranscriptOperation } from '@dxos/plugin-transcription/types';
import { getSpace } from '@dxos/react-client/echo';
import { Text } from '@dxos/schema';

import { Meeting, MeetingOperation } from '#types';

const handler: Operation.WithHandler<typeof MeetingOperation.Create> = MeetingOperation.Create.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ name, channel, event }) {
      const eventTarget = event && (yield* Effect.promise(() => event.load()));
      // Space is derived from whichever anchor is supplied (channel for in-call meetings, event otherwise).
      // Both anchors must resolve to the same space, else the meeting would be written to one DB while
      // linking an event in another — breaking event→meeting lookup.
      const channelSpace = channel ? getSpace(channel) : undefined;
      const eventSpace = eventTarget ? getSpace(eventTarget) : undefined;
      invariant(channelSpace || eventSpace, 'create meeting requires a channel or event anchor');
      invariant(
        !channelSpace || !eventSpace || channelSpace === eventSpace,
        'channel and event must belong to the same space',
      );
      const space = channelSpace ?? eventSpace;
      invariant(space);
      const { object: transcript } = yield* Operation.invoke(TranscriptOperation.Create, { space });
      // `event` is a Ref (works for feed/queue events, unlike a relation endpoint).
      const meeting = Obj.make(Meeting.Meeting, {
        name,
        participants: [],
        transcript: Ref.make(transcript),
        notes: Ref.make(Text.make()),
        summary: Ref.make(Text.make()),
        ...(event ? { event } : {}),
      });

      // Persist the meeting here when created from an event (the event-graph action has no other add
      // path); callers that pass only a channel add the returned meeting themselves.
      if (event) {
        space.db.add(meeting);
      }

      return { object: meeting };
    }),
  ),
);

export default handler;

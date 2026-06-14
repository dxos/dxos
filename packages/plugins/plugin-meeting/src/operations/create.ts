// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Obj, Ref, Relation } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { TranscriptOperation } from '@dxos/plugin-transcription/types';
import { getSpace } from '@dxos/react-client/echo';
import { Text } from '@dxos/schema';
import { AnchoredTo } from '@dxos/types';

import { Meeting, MeetingOperation } from '#types';

const handler: Operation.WithHandler<typeof MeetingOperation.Create> = MeetingOperation.Create.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ name, channel, event }) {
      const eventTarget = event && (yield* Effect.promise(() => event.load()));
      // Space is derived from whichever anchor is supplied (channel for in-call meetings, event otherwise).
      const space = getSpace(channel ?? eventTarget);
      invariant(space);
      const { object: transcript } = yield* Operation.invoke(TranscriptOperation.Create, { space });
      const meeting = Obj.make(Meeting.Meeting, {
        name,
        created: new Date().toISOString(),
        participants: [],
        transcript: Ref.make(transcript),
        notes: Ref.make(Text.make()),
        summary: Ref.make(Text.make()),
      });

      // Anchor the meeting to the event. The relation (and its endpoints) must live in the db, so add
      // the meeting here; callers that pass only a channel add the returned meeting themselves.
      if (eventTarget) {
        space.db.add(meeting);
        space.db.add(
          Relation.make(AnchoredTo.AnchoredTo, { [Relation.Source]: meeting, [Relation.Target]: eventTarget }),
        );
      }

      return { object: meeting };
    }),
  ),
);

export default handler;

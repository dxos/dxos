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
    Effect.fnUntraced(function* ({ name, channel }) {
      const space = getSpace(channel);
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

      return { object: meeting };
    }),
  ),
);

export default handler;

// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import type { Capability } from '@dxos/app-framework';
import { Obj, Ref } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { ThreadOperation } from '@dxos/plugin-thread/operations';
import { TranscriptOperation } from '@dxos/plugin-transcription/operations';
import { getSpace } from '@dxos/react-client/echo';
import { Text } from '@dxos/schema';
import { invariant } from '@dxos/invariant';

import { Create } from './definitions';

import { Meeting } from '../types';

export default Create.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ name, channel }) {
      const space = getSpace(channel);
      invariant(space);
      const { object: transcript } = yield* Operation.invoke(TranscriptOperation.Create, { space });
      const { object: thread } = yield* Operation.invoke(ThreadOperation.CreateChannelThread, { channel });
      const meeting = Obj.make(Meeting.Meeting, {
        name,
        created: new Date().toISOString(),
        participants: [],
        transcript: Ref.make(transcript),
        notes: Ref.make(Text.make()),
        summary: Ref.make(Text.make()),
        thread: Ref.make(thread),
      });

      return { object: meeting };
    }),
  ),
);

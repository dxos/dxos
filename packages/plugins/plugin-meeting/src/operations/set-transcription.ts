//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import * as CallsCapabilities from '@dxos/plugin-calls/CallsCapabilities';

import { MeetingActivity, MeetingOperation } from '#types';

const handler: Operation.WithHandler<typeof MeetingOperation.SetTranscription> = MeetingOperation.SetTranscription.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ enabled }) {
      const callManager = yield* Capability.get(CallsCapabilities.Manager);
      // Shared with the call, so every participant keeps or stops keeping their own speech together.
      callManager.setActivity(MeetingActivity.TRANSCRIPTION_KEY, {
        enabled,
      } satisfies MeetingActivity.TranscriptionPayload);
    }),
  ),
);

export default handler;

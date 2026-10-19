//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { DXN } from '@dxos/keys';

/**
 * Test seam for stories, tests and demo recordings: fills the call with participants played from video files,
 * with no swarm or SFU behind them. Invoke before joining; an empty list removes them.
 */
export const SetSimulatedParticipants = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.calls.setSimulatedParticipants'),
    name: 'Set Simulated Call Participants',
    icon: 'ph--users-three--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    participants: Schema.Array(
      Schema.Struct({
        name: Schema.String,
        /** Video file URL; its picture and sound become the participant's camera and microphone. */
        src: Schema.String,
        /** A screen recording the participant shares from `start` seconds into the conversation. */
        screenshare: Schema.optional(Schema.Struct({ src: Schema.String, start: Schema.Number })),
        /** Shows an abstract shape that moves with the file's sound instead of its picture; `src` may be audio only. */
        avatar: Schema.optional(Schema.Boolean),
      }),
    ),
    /** The conversation's lines, local user's included, timed in seconds from the top of the files. */
    transcript: Schema.optional(
      Schema.Array(Schema.Struct({ speaker: Schema.String, start: Schema.Number, text: Schema.String })),
    ),
  }),
  output: Schema.Void,
});

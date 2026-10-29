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
        /**
         * Shows an agent visualization driven by the file's sound instead of its picture, so `src` may be audio only:
         * `true` for the default look, or a visualization id with config overrides. Drawn only where the caller of
         * `CallManager.simulate` supplies an avatar renderer; otherwise the file's picture shows.
         */
        avatar: Schema.optional(
          Schema.Union([
            Schema.Boolean,
            Schema.Struct({
              visualization: Schema.String,
              config: Schema.optional(Schema.Record(Schema.String, Schema.Union([Schema.Number, Schema.String]))),
            }),
          ]),
        ),
      }),
    ),
    /** The conversation's lines, local user's included, timed in seconds from the top of the files. */
    transcript: Schema.optional(
      Schema.Array(Schema.Struct({ speaker: Schema.String, start: Schema.Number, text: Schema.String })),
    ),
  }),
  output: Schema.Void,
});

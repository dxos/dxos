//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

/** What a take records besides the voice. */
export const VideoSource = Schema.Literals(['none', 'screen', 'camera']);
export type VideoSource = Schema.Schema.Type<typeof VideoSource>;

/** A click step revealed while the slide was read, in seconds from the start of the take. */
export const Step = Schema.Struct({
  step: Schema.Number,
  at: Schema.Number,
});
export type Step = Schema.Schema.Type<typeof Step>;

/** How a take was recorded, kept in its Variant's `config`. */
export const Log = Schema.Struct({
  /** Length of the take, in seconds. */
  duration: Schema.Number,
  steps: Schema.Array(Step),
  /** Label of the microphone. */
  device: Schema.optional(Schema.String),
  source: VideoSource,
  /** Shared by the takes of one recording across the whole presentation. */
  session: Schema.optional(Schema.String),
});
export type Log = Schema.Schema.Type<typeof Log>;

/** Decodes a Variant's `config` as a take log; undefined for a variant that is not a take. */
export const fromConfig = (config: unknown): Log | undefined => {
  const result = Schema.decodeUnknownOption(Log)(config);
  return result._tag === 'Some' ? result.value : undefined;
};

/** Takes are named by the time they started, so a name is never reused. */
export const makeName = (date: Date): string =>
  `take-${date.toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '-')}`;

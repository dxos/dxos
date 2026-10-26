//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

/** What the take recorded besides the voice. */
export const VideoSource = Schema.Literals(['none', 'screen', 'camera']);
export type VideoSource = Schema.Schema.Type<typeof VideoSource>;

/** One visit to a slide, in seconds on the take's own clock. */
export const Section = Schema.Struct({
  /** The Slide's id. */
  id: Schema.String,
  title: Schema.optional(Schema.String),
  start: Schema.Number,
  end: Schema.Number,
});
export type Section = Schema.Schema.Type<typeof Section>;

/** A click step revealed on a slide. */
export const Step = Schema.Struct({
  id: Schema.String,
  step: Schema.Number,
  at: Schema.Number,
});
export type Step = Schema.Schema.Type<typeof Step>;

/** The timeline of a take, kept in its Variant's `config` so post-processing can lay the voice onto a picture. */
export const Log = Schema.Struct({
  sections: Schema.Array(Section),
  steps: Schema.Array(Step),
  /** Length of the take, in seconds. */
  duration: Schema.Number,
  /** Label of the microphone. */
  device: Schema.optional(Schema.String),
  source: VideoSource,
});
export type Log = Schema.Schema.Type<typeof Log>;

/** Decodes a Variant's `config` as a take log; undefined for a variant that is not a take. */
export const fromConfig = (config: unknown): Log | undefined => {
  const result = Schema.decodeUnknownOption(Log)(config);
  return result._tag === 'Some' ? result.value : undefined;
};

/** Seconds spent on each slide across a take (a slide visited twice adds both visits), in order of first visit. */
export const slideSeconds = (log: Pick<Log, 'sections'>): Map<string, number> => {
  const totals = new Map<string, number>();
  for (const { id, start, end } of log.sections) {
    totals.set(id, (totals.get(id) ?? 0) + (end - start));
  }
  return totals;
};

/** Each slide a take showed, in order of first visit, with its title and the seconds spent on it. */
export const summarize = (log: Pick<Log, 'sections'>): { id: string; title?: string; seconds: number }[] => {
  const titles = new Map<string, string>();
  for (const { id, title } of log.sections) {
    if (title && !titles.has(id)) {
      titles.set(id, title);
    }
  }
  return [...slideSeconds(log)].map(([id, seconds]) => ({ id, title: titles.get(id), seconds }));
};

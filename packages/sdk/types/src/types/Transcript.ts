//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Feed, Obj, Ref, Type } from '@dxos/echo';
import { HiddenAnnotation } from '@dxos/echo/Annotation';

/**
 * Root transcript object created when the user starts a transcription.
 */
// TODO(dmaretskyi): Convert `queue` to `Ref.Ref(Feed.Feed)` (see plugin-assistant migrations for pattern).
export class Transcript extends Type.makeObject<Transcript>(DXN.make('org.dxos.type.transcript', '0.1.0'))(
  Schema.Struct({
    started: Schema.optional(Schema.String),
    ended: Schema.optional(Schema.String),

    /**
     * Feed containing TranscriptBlock objects.
     */
    feed: Ref.Ref(Feed.Feed),

    /**
     * Cumulative live summary maintained by the summarization stage.
     * Inline string; distinct from `Meeting.summary`, which is a `Text` document.
     */
    summary: Schema.optional(Schema.String),
    summaryUpdatedAt: Schema.optional(Schema.String),

    /**
     * Deictic / anaphoric references the summarization stage resolved (e.g. "I" → the speaker).
     */
    resolvedReferents: Schema.optional(
      Schema.mutable(
        Schema.Array(
          Schema.Struct({
            surface: Schema.String,
            referent: Schema.String,
            ref: Schema.optional(Ref.Ref(Obj.Unknown)),
          }),
        ),
      ),
    ),

    /**
     * The pipeline configuration that drove this transcript (absent → default preset).
     * Typed loosely to avoid a dependency cycle from `@dxos/types` into the pipeline package;
     * consumers resolve it to a `PipelineConfig`.
     */
    pipeline: Schema.optional(Ref.Ref(Obj.Unknown)),
  }).pipe(HiddenAnnotation.set(true), Annotation.IconAnnotation.set({ icon: 'ph--subtitles--regular', hue: 'sky' })),
) {}

/**
 * First message in queue.
 * Contains metadata for the recording and transcript.
 */
const TranscriptHeader = Schema.Struct({
  started: Schema.optional(Schema.String),
});

export type TranscriptHeader = Schema.Schema.Type<typeof TranscriptHeader>;

export const make = (feed: Ref.Ref<Feed.Feed>): Transcript => Obj.make(Transcript, { feed });

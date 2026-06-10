//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Annotation, Feed, Obj, Ref, Type } from '@dxos/echo';
import { HiddenAnnotation } from '@dxos/echo/internal';

/**
 * Root transcript object created when the user starts a transcription.
 */
// TODO(dmaretskyi): Convert `queue` to `Ref.Ref(Feed.Feed)` (see plugin-assistant migrations for pattern).
export const Transcript = Schema.Struct({
  started: Schema.optional(Schema.String),
  ended: Schema.optional(Schema.String),

  /**
   * Feed containing TranscriptBlock objects.
   */
  feed: Ref.Ref(Feed.Feed),
}).pipe(
  HiddenAnnotation.set(true),
  Annotation.IconAnnotation.set({ icon: 'ph--subtitles--regular', hue: 'sky' }),
  Type.makeObject(DXN.make('org.dxos.type.transcript', '0.1.0')),
);

export type Transcript = Type.InstanceType<typeof Transcript>;

/**
 * First message in queue.
 * Contains metadata for the recording and transcript.
 */
const TranscriptHeader = Schema.Struct({
  started: Schema.optional(Schema.String),
});

export type TranscriptHeader = Schema.Schema.Type<typeof TranscriptHeader>;

export const make = (feed: Ref.Ref<Feed.Feed>): Transcript => Obj.make(Transcript, { feed });

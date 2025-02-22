//
// Copyright 2025 DXOS.org
//

import { EchoObject, ObjectId, S } from '@dxos/echo-schema';

/**
 * Transcription metadata.
 */
const TranscriptionMetadataSchema = S.Struct({
  id: ObjectId,

  /**
   * Timestamp of the transcription creation.
   */
  timestamp: S.optional(S.Date),
});

export const TranscriptionMetadata = TranscriptionMetadataSchema.pipe(
  EchoObject('dxos.org/type/TranscriptionMetadata', '0.1.0'),
);
export type TranscriptionMetadata = S.Schema.Type<typeof TranscriptionMetadata>;

/**
 * Segment of transcription.
 */
const Segment = S.Struct({
  /**
   * Timestamp of the segment.
   */
  // TODO(burdon): TS from service is not Unix TS (x1000).
  timestamp: S.Date,

  /**
   * Text of the segment.
   */
  text: S.String,
});

export type Segment = S.Schema.Type<typeof Segment>;

// TODO(burdon): Rename TranscriptionBlock.
const TranscriptionBlockSchema = S.Struct({
  id: ObjectId,
  author: S.String,
  segments: S.Array(Segment),
});

export const TranscriptionBlock = TranscriptionBlockSchema.pipe(
  EchoObject('dxos.org/type/TranscriptionBlock', '0.1.0'),
);

export type TranscriptionBlock = S.Schema.Type<typeof TranscriptionBlock>;

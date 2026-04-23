//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

/**
 * Shape of the JSON payload sent by the Composer browser extension over the
 * `window` `CustomEvent('composer:clip')` bridge.
 *
 * The envelope is versioned (`version: 1`) so future schema changes can land
 * without breaking older receivers. The `kind` set is intentionally open so
 * the extension can ship new kinds independently; the receiver rejects
 * unknown kinds with a stable error code.
 */
export const Rect = Schema.Struct({
  x: Schema.Number,
  y: Schema.Number,
  width: Schema.Number,
  height: Schema.Number,
});

export const Source = Schema.Struct({
  url: Schema.String,
  title: Schema.String,
  favicon: Schema.optional(Schema.String),
  clippedAt: Schema.String,
});
export type Source = Schema.Schema.Type<typeof Source>;

export const Selection = Schema.Struct({
  text: Schema.String,
  html: Schema.optional(Schema.String),
  htmlTruncated: Schema.optional(Schema.Boolean),
  rect: Schema.optional(Rect),
});
export type Selection = Schema.Schema.Type<typeof Selection>;

export const Hints = Schema.Struct({
  ogTitle: Schema.optional(Schema.String),
  ogDescription: Schema.optional(Schema.String),
  ogImage: Schema.optional(Schema.String),
  jsonLd: Schema.optional(Schema.Array(Schema.Unknown)),
  h1: Schema.optional(Schema.String),
  firstImage: Schema.optional(Schema.String),
});
export type Hints = Schema.Schema.Type<typeof Hints>;

export const Kind = Schema.Literal('person', 'organization');
export type Kind = Schema.Schema.Type<typeof Kind>;

/**
 * Supported kinds known to the receiver. Unknown strings are rejected at
 * runtime with `unsupportedKind` rather than at decode time, so the
 * extension can ship new kinds without older Composer builds producing a
 * generic `invalidPayload` error.
 */
export const SUPPORTED_KINDS: readonly string[] = ['person', 'organization'];

/**
 * Loose envelope — used as the first-pass decode so we can inspect
 * `version` and respond with `unsupportedVersion` (rather than the generic
 * `invalidPayload`) when an older receiver sees a newer payload. Anything
 * that isn't an object with a numeric `version` is rejected outright.
 */
export const Envelope = Schema.Struct({
  version: Schema.Number,
});
export type Envelope = Schema.Schema.Type<typeof Envelope>;

/**
 * Clip envelope sent extension → Composer. The V1 payload schema. Only
 * decoded after the loose envelope decode confirms `version === 1`.
 */
export const Clip = Schema.Struct({
  version: Schema.Literal(1),
  kind: Schema.String.pipe(Schema.annotations({ description: 'Kind of object to create.' })),
  source: Source,
  selection: Selection,
  hints: Schema.optional(Hints),
});
export type Clip = Schema.Schema.Type<typeof Clip>;

/**
 * Ack payload dispatched as `CustomEvent('composer:clip:ack')` on window.
 * Stable error codes:
 *   - `invalidPayload`       : schema decoding failed
 *   - `unsupportedVersion`   : envelope version not supported
 *   - `unsupportedKind`      : kind not recognized (future kinds)
 *   - `noSpace`              : no active space to write into
 *   - `internal`             : unexpected error during creation
 */
export type Ack = { ok: true; id: string } | { ok: false; error: string };

export const CLIP_EVENT = 'composer:clip';
export const CLIP_ACK_EVENT = 'composer:clip:ack';

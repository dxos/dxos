//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

/**
 * Bumped whenever the message shapes below change incompatibly. The bridge closes the connection
 * rather than guessing when the two sides disagree.
 */
export const PROTOCOL_VERSION = 1;

/** Loopback port the Elgato-hosted plugin listens on. */
export const DEFAULT_PORT = 21435;

/**
 * Physical characteristics of a Stream Deck model. The device plugin reports these so the brain
 * knows how many slots to fill and at what resolution to render.
 */
export const DeviceProfile = Schema.Struct({
  model: Schema.String,
  keys: Schema.Number,
  dials: Schema.Number,
  /** Key image size in pixels, `[width, height]`. */
  keySize: Schema.Tuple([Schema.Number, Schema.Number]),
  /** Touch-strip segment size in pixels, one segment per dial. */
  dialSize: Schema.Tuple([Schema.Number, Schema.Number]),
});
export type DeviceProfile = Schema.Schema.Type<typeof DeviceProfile>;

/** 8 keys, 4 dials, and a touch strip divided into one 200x100 segment per dial. */
export const streamDeckPlus: DeviceProfile = {
  model: 'Stream Deck +',
  keys: 8,
  dials: 4,
  keySize: [144, 144],
  dialSize: [200, 100],
};

/** One rendered key. Elgato's `setImage` accepts an SVG string, so no rasterisation is needed. */
export const KeyImage = Schema.Struct({
  svg: Schema.String,
  /** Object DXN the key resolves to, echoed back with a press so the device stays stateless. */
  target: Schema.optional(Schema.String),
});
export type KeyImage = Schema.Schema.Type<typeof KeyImage>;

/**
 * One touch-strip segment, expressed semantically rather than as an Elgato layout so the device
 * plugin owns the mapping onto `setFeedback`.
 */
export const DialFeedback = Schema.Struct({
  title: Schema.String,
  value: Schema.String,
  /** Fraction in `[0, 1]`; absent for an indeterminate or non-progress segment. */
  bar: Schema.optional(Schema.Number),
});
export type DialFeedback = Schema.Schema.Type<typeof DialFeedback>;

/** Device -> brain: sent once on connect. */
export const Hello = Schema.Struct({
  _tag: Schema.Literal('hello'),
  protocol: Schema.Number,
  device: DeviceProfile,
});
export type Hello = Schema.Schema.Type<typeof Hello>;

export const InputKind = Schema.Literals(['keyDown', 'keyUp', 'dialDown', 'dialUp', 'dialRotate', 'touchTap']);
export type InputKind = Schema.Schema.Type<typeof InputKind>;

/** Device -> brain: a key or dial interaction. `slot` indexes keys or dials by `kind`. */
export const Input = Schema.Struct({
  _tag: Schema.Literal('input'),
  kind: InputKind,
  slot: Schema.Number,
  /** Detent count for `dialRotate`; negative is counter-clockwise. */
  ticks: Schema.optional(Schema.Number),
});
export type Input = Schema.Schema.Type<typeof Input>;

/** Brain -> device: the full display state. A `null` slot is cleared. */
export const Frame = Schema.Struct({
  _tag: Schema.Literal('frame'),
  keys: Schema.Array(Schema.NullOr(KeyImage)),
  dials: Schema.Array(Schema.NullOr(DialFeedback)),
});
export type Frame = Schema.Schema.Type<typeof Frame>;

export const DeviceMessage = Schema.Union([Hello, Input]);
export type DeviceMessage = Schema.Schema.Type<typeof DeviceMessage>;

export const BrainMessage = Frame;
export type BrainMessage = Schema.Schema.Type<typeof BrainMessage>;

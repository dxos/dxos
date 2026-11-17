//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { type Aspect, define } from './ViewState.ts';

/** Where one scrolling area is scrolled to; see `ScrollArea.ScrollPosition` in react-ui. */
export const Position = Schema.Struct({
  anchor: Schema.optional(Schema.String),
  offset: Schema.optional(Schema.Number),
  y: Schema.Number,
  x: Schema.optional(Schema.Number),
});

export type Position = Schema.Schema.Type<typeof Position>;

/** The position of each tracked scrolling area in an object's view, by area name (`main` for the outermost). */
export const State = Schema.Record(Schema.String, Position);

export type State = Schema.Schema.Type<typeof State>;

/**
 * The scroll of an object's article, keyed by the object's EID and kept for the session, so a view comes back where it
 * was left; a follower takes the leader's.
 */
export const aspect: Aspect<State> = define<State>({
  key: 'org.dxos.react-ui-attention.scroll',
  backend: 'memory',
  schema: State,
  defaultValue: () => ({}),
  follow: 'write',
});

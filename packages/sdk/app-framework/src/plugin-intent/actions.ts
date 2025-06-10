//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { Label } from './intent';

export const INTENT_PLUGIN = 'dxos.org/plugin/intent';
export const INTENT_ACTION = `${INTENT_PLUGIN}/action`;

export namespace IntentAction {
  /**
   * Log an intent.
   */
  export class Track extends Schema.TaggedClass<Track>()(`${INTENT_ACTION}/track`, {
    input: Schema.Struct({
      intents: Schema.Array(Schema.String),
      error: Schema.optional(Schema.String),
    }),
    output: Schema.Void,
  }) {}

  /**
   * Fired after an intent is dispatched if the intent is undoable.
   */
  export class ShowUndo extends Schema.TaggedClass<ShowUndo>()(`${INTENT_ACTION}/show-undo`, {
    input: Schema.Struct({
      message: Label,
    }),
    output: Schema.Void,
  }) {}
}

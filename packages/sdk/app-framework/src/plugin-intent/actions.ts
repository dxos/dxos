//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { Label } from './intent';
import { meta } from './meta';

export namespace IntentAction {
  /**
   * Log an intent.
   */
  export class Track extends Schema.TaggedClass<Track>()(`${meta.id}/action/track`, {
    input: Schema.Struct({
      intents: Schema.Array(Schema.String),
      error: Schema.optional(Schema.String),
    }),
    output: Schema.Void,
  }) {}

  /**
   * Fired after an intent is dispatched if the intent is undoable.
   */
  export class ShowUndo extends Schema.TaggedClass<ShowUndo>()(`${meta.id}/action/show-undo`, {
    input: Schema.Struct({
      message: Label,
    }),
    output: Schema.Void,
  }) {}
}

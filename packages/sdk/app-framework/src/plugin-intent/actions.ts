//
// Copyright 2025 DXOS.org
//

import { Schema as S } from 'effect';

import { Label } from './intent';

export const INTENT_PLUGIN = 'dxos.org/plugin/intent';
export const INTENT_ACTION = `${INTENT_PLUGIN}/action`;

export namespace IntentAction {
  /**
   * Fired after an intent is dispatched if the intent is undoable.
   */
  export class ShowUndo extends S.TaggedClass<ShowUndo>()(`${INTENT_ACTION}/show-undo`, {
    input: S.Struct({
      message: Label,
    }),
    output: S.Void,
  }) {}
}

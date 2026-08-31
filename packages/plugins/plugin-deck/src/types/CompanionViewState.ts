//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { ViewState } from '@dxos/react-ui-attention/types';

/** Global context for the deck-companion view state. */
export const CONTEXT = 'deck-companion';

export const State = Schema.Struct({
  /** Linked variant of the currently selected companion tab. */
  variant: Schema.optional(Schema.String),
}).mapFields(Struct.map(Schema.mutableKey));

export type State = Schema.Schema.Type<typeof State>;

/**
 * Global companion view state, persisted (localStorage) so reopening the companion restores the last
 * selected tab. The companion's width is not stored here — it lives with the plank widths in
 * `DeckState.plankSizing`, so switching tabs never resizes the pane.
 */
export const aspect: ViewState.Aspect<State> = ViewState.define<State>({
  key: 'deck-companion',
  backend: 'local',
  schema: State,
  defaultValue: () => ({}),
});

//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { ViewState } from '@dxos/react-ui-attention';

/** Global context for the deck-companion view state. */
export const COMPANION_VIEW_STATE_CONTEXT = 'deck-companion';

const CompanionState = Schema.Struct({
  /** Linked variant of the currently selected companion tab. */
  variant: Schema.optional(Schema.String),
}).pipe(Schema.mutable);

export type CompanionState = Schema.Schema.Type<typeof CompanionState>;

/**
 * Global companion view state, persisted (localStorage) so reopening the companion restores the last
 * selected tab. The companion's width is not stored here — it lives with the plank widths in
 * `DeckState.plankSizing`, so switching tabs never resizes the pane.
 */
export const companionAspect: ViewState.Aspect<CompanionState> = ViewState.define<CompanionState>({
  key: 'deck-companion',
  backend: 'local',
  schema: CompanionState,
  defaultValue: () => ({}),
});

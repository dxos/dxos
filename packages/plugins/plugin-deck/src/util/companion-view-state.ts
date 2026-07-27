//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { ViewState } from '@dxos/react-ui-attention';

/** Global context shared by the deck-companion view state (selected variant + split point). */
export const COMPANION_VIEW_STATE_CONTEXT = 'deck-companion';

const CompanionState = Schema.Struct({
  /** Linked variant of the currently selected companion tab. */
  variant: Schema.optional(Schema.String),
  /** Split point (rem) for the side-by-side companion layout. */
  horizontal: Schema.optional(Schema.Number),
  /** Split point (rem) for the stacked companion layout. */
  vertical: Schema.optional(Schema.Number),
}).pipe(Schema.mutable);

export type CompanionState = Schema.Schema.Type<typeof CompanionState>;

/**
 * Global companion view state — the selected tab variant plus the per-orientation split point —
 * persisted (localStorage) so reopening the companion restores the last tab and size. One aspect
 * for the companion surface, rather than a separate aspect for variant and split.
 */
export const companionAspect: ViewState.Aspect<CompanionState> = ViewState.define<CompanionState>({
  key: 'deck-companion',
  backend: 'local',
  schema: CompanionState,
  defaultValue: () => ({}),
});

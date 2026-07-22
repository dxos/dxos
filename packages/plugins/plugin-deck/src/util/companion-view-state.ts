//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { ViewState } from '@dxos/react-ui-attention';

/** Global context shared by the deck-companion view-state aspects (split point + selected variant). */
export const COMPANION_VIEW_STATE_CONTEXT = 'deck-companion';

const CompanionSelection = Schema.Struct({
  /** Linked variant of the currently selected companion tab. */
  variant: Schema.optional(Schema.String),
}).pipe(Schema.mutable);

export type CompanionSelection = Schema.Schema.Type<typeof CompanionSelection>;

/**
 * The globally-selected companion variant, persisted (localStorage) so reopening the companion restores
 * the last-selected tab. Stored via react-ui-attention view state for consistency with the split point.
 */
export const companionVariantAspect: ViewState.Aspect<CompanionSelection> = ViewState.defineViewState<CompanionSelection>({
  key: 'deck-companion-variant',
  backend: 'local',
  schema: CompanionSelection,
  defaultValue: () => ({}),
});

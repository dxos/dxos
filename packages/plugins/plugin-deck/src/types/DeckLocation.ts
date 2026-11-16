//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { ViewState } from '@dxos/react-ui-attention/types';

/** Where the deck is in one space. */
export const State = Schema.Struct({
  /** The plank the deck is scrolled to, when it is in the space. */
  front: Schema.optional(Schema.String),
  /** Its planks in the space whose companion is open. */
  companions: Schema.Array(Schema.String),
  /** The companion tab it shows them in. */
  variant: Schema.optional(Schema.String),
});

export type State = Schema.Schema.Type<typeof State>;

/** The deck's location in each space it shows, keyed by the space's EID; followers mirror it. */
export const aspect: ViewState.Aspect<State> = ViewState.define<State>({
  key: 'org.dxos.plugin.deck.location',
  backend: 'memory',
  schema: State,
  defaultValue: () => ({ companions: [] }),
});

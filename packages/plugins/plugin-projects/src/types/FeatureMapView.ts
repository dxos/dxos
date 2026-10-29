//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { ViewState } from '@dxos/react-ui-attention/types';

/** Canvas lays the features out as a dependency graph, Kanban groups them by status, Document shows the spec's `.mdl` text. */
export const Mode = Schema.Literals(['document', 'canvas', 'kanban']);
export type Mode = Schema.Schema.Type<typeof Mode>;

export const State = Schema.Struct({
  mode: Mode,
  /** The feature the map is zoomed into, whose breakdown spec it shows; the spec's own level when absent. */
  focus: Schema.optional(Schema.String),
});
export type State = Schema.Schema.Type<typeof State>;

/** A spec's map view, keyed by the spec's id and kept in localStorage so reopening the spec restores it. */
export const aspect: ViewState.Aspect<State> = ViewState.define<State>({
  key: 'org.dxos.plugin.projects.featureMap',
  backend: 'local',
  schema: State,
  defaultValue: () => ({ mode: 'canvas' }),
});

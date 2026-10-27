//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { ViewState } from '@dxos/react-ui-attention/types';

/** Canvas lays the features out as a dependency graph; Kanban groups them by status. */
export const Mode = Schema.Literals(['canvas', 'kanban']);
export type Mode = Schema.Schema.Type<typeof Mode>;

export const State = Schema.Struct({
  mode: Mode,
  /** The feature the map is zoomed into, whose subfeatures it shows; the project's top level when absent. */
  focus: Schema.optional(Schema.String),
});
export type State = Schema.Schema.Type<typeof State>;

/** A project's Features tab view, keyed by the project's id and kept in localStorage so reopening the project restores it. */
export const aspect: ViewState.Aspect<State> = ViewState.define<State>({
  key: 'org.dxos.plugin.projects.featureMap',
  backend: 'local',
  schema: State,
  defaultValue: () => ({ mode: 'canvas' }),
});

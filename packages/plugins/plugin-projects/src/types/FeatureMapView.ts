//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { ViewState } from '@dxos/react-ui-attention/types';

/** Cards lists the features in map order; Canvas lays them out as a dependency graph. */
export const Mode = Schema.Literals(['cards', 'canvas']);
export type Mode = Schema.Schema.Type<typeof Mode>;

export const State = Schema.Struct({ mode: Mode });
export type State = Schema.Schema.Type<typeof State>;

/** A feature map article's view, keyed by the map's id and kept in localStorage so reopening a map restores it. */
export const aspect: ViewState.Aspect<State> = ViewState.define<State>({
  key: 'org.dxos.plugin.projects.featureMap',
  backend: 'local',
  schema: State,
  defaultValue: () => ({ mode: 'cards' }),
});

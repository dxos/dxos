//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { ViewState } from '@dxos/react-ui-attention/types';

/** Overview is everything the project owns; Tasks gives the ledger the whole panel. */
export const Tab = Schema.Literals(['overview', 'tasks']);
export type Tab = Schema.Schema.Type<typeof Tab>;

export const State = Schema.Struct({
  tab: Tab,
  /** Whether the pipeline chart is shown under the ledger. */
  pipeline: Schema.Boolean,
});
export type State = Schema.Schema.Type<typeof State>;

/**
 * A project article's view state — the selected tab and whether the pipeline chart is open — keyed
 * by the project's id and persisted (localStorage) so reopening a project restores where the reader
 * left it.
 */
export const aspect: ViewState.Aspect<State> = ViewState.define<State>({
  key: 'org.dxos.plugin.projects.project',
  backend: 'local',
  schema: State,
  defaultValue: () => ({ tab: 'overview', pipeline: false }),
});

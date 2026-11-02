//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { ViewState } from '@dxos/react-ui-attention/types';

/** Overview is everything the project owns; `spec` is the Specs tab, one of its specs at a time; Tasks gives the ledger the whole panel. */
export const Tab = Schema.Literals(['overview', 'spec', 'tasks']);
export type Tab = Schema.Schema.Type<typeof Tab>;

/** The pipeline chart's axis: `time` fits the run to the pane, `unit` steps per event and scrolls. */
export const Axis = Schema.Literals(['time', 'unit']);
export type Axis = Schema.Schema.Type<typeof Axis>;

/** What the pipeline chart's first column shows per lane: its title, or its token and tool counts. */
export const Legend = Schema.Literals(['title', 'stats']);
export type Legend = Schema.Schema.Type<typeof Legend>;

export const State = Schema.Struct({
  tab: Tab,
  /** Whether the pipeline chart is shown under the ledger. */
  pipeline: Schema.Boolean,
  /** Optional so state persisted before the toggle existed still decodes; absent reads as `time`. */
  axis: Schema.optional(Axis),
  /** Optional for the same reason as `axis`; absent reads as `title`. */
  legend: Schema.optional(Legend),
  /** The id of the spec the Specs tab shows; absent, or naming a spec since removed, reads as the first. */
  spec: Schema.optional(Schema.String),
  /** The Specs tab's view of its spec: absent (its text), or the id of a {@link SpecView} another plugin offers. */
  view: Schema.optional(Schema.String),
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

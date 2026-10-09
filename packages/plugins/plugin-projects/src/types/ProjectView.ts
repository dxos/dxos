//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Role from '@dxos/app-framework/Role';
import type * as Project from '@dxos/compute/Project';
import { ViewState } from '@dxos/react-ui-attention/types';

/** Overview is everything the project owns; Tasks gives the ledger the whole panel. */
export const Tab = Schema.Literals(['overview', 'tasks']);
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

/**
 * Settings other plugins add to a project's overview, such as where its code lives on this device;
 * rendered inside the overview's form, so a contribution can use `Form.FieldSet`.
 */
export const Settings: Role.Role<{ project: Project.Project }> = Role.make('org.dxos.plugin.projects.role.settings');

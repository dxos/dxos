//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Role from '@dxos/app-framework/Role';
import type * as Project from '@dxos/compute/Project';
import type * as Spec from '@dxos/compute/Spec';
import type { Obj } from '@dxos/echo';
import { ViewState } from '@dxos/react-ui-attention/types';
import type { Task } from '@dxos/types';

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

/**
 * Settings other plugins add to a project's overview, such as where its code lives on this device;
 * rendered inside the overview's form, so a contribution can use `Form.FieldSet`.
 */
export const Settings: Role.Role<{ project: Project.Project }> = Role.make('org.dxos.plugin.projects.role.settings');

/** A spec's own view beside its text, which another plugin contributes for the specs using its dialects. */
export type SpecViewData = {
  subject: Spec.Spec;
  /** The id of the view picked, among those the contributing plugin offers. */
  view: string;
  project: Project.Project;
  /** The level the Specs tab is at, when another plugin's level nests beneath one of the project's specs. */
  level?: Obj.Unknown;
  attendableId: string;
};

/** Renders a contributed view of a spec on the project's Specs tab. */
export const SpecView: Role.Role<SpecViewData> = Role.make('org.dxos.plugin.projects.role.specView');

/** The project article at a level another plugin nests beneath one of the project's specs. */
export type LevelData = {
  /** The plank role the article renders in. */
  role?: string;
  project: Project.Project;
  level: Obj.Unknown;
  /** The spec that breaks the level down; the Specs tab offers to add one when absent. */
  spec?: Spec.Spec;
  attendableId: string;
  /** The ids of the tasks the level's Tasks tab shows. */
  taskScope?: readonly string[];
  /** Called for a task added on the level's Tasks tab, so the level can claim it. */
  onTaskCreated?: (task: Task.Task) => void | Promise<void>;
  /** Adds the spec that breaks the level down. */
  onAddSpec?: () => void;
};

export const Level: Role.Role<LevelData> = Role.make('org.dxos.plugin.projects.role.level');

/** The Overview tab at a level, contributed by the plugin that nests it. */
export const LevelOverview: Role.Role<{ subject: Obj.Unknown; project: Project.Project; attendableId: string }> =
  Role.make('org.dxos.plugin.projects.role.levelOverview');

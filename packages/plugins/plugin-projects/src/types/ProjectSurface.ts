//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Role from '@dxos/app-framework/Role';
import type * as Project from '@dxos/compute/Project';
import type * as Spec from '@dxos/compute/Spec';
import type { Obj } from '@dxos/echo';
import type { Task } from '@dxos/types';

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

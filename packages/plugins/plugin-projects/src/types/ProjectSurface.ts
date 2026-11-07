//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Role from '@dxos/app-framework/Role';
import type * as Project from '@dxos/compute/Project';
import type * as Spec from '@dxos/compute/Spec';
import type { Obj } from '@dxos/echo';
import type { Task } from '@dxos/types';

import type * as SpecSession from '../SpecSession.ts';

/** A view of a spec in one of its companion tabs, for the specs using the contributor's dialects. */
export type SpecViewData = {
  subject: Spec.Spec;
  /** The id of the view picked, among those contributed to the tab. */
  view: string;
  /** The project the spec is shown in, when it is shown on a project's Specs tab. */
  project?: Project.Project;
  /** The plank the companion accompanies, whose attention the view shares. */
  attendableId: string;
};

/** Renders a contributed view of a spec in its companion tab. */
export const SpecView: Role.Role<SpecViewData> = Role.make('org.dxos.plugin.projects.role.specView');

/** One companion tab of a spec, for a plugin whose plank shows the spec under another subject, such as a level. */
export type SpecCompanionData = {
  subject: Spec.Spec;
  group: SpecSession.Group;
  project?: Project.Project;
  attendableId: string;
};

export const SpecCompanion: Role.Role<SpecCompanionData> = Role.make('org.dxos.plugin.projects.role.specCompanion');

/** Where a spec comes from (a branch, a pull request, its sync state) and what diff mode compares it with. */
export const SpecToolbar: Role.Role<{ subject: Spec.Spec }> = Role.make('org.dxos.plugin.projects.role.specToolbar');

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

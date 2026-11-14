//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Role from '@dxos/app-framework/Role';
import type * as Project from '@dxos/compute/Project';
import type * as Spec from '@dxos/compute/Spec';

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

/** One companion tab of a spec, for a plugin whose plank shows the spec under another subject. */
export type SpecCompanionData = {
  subject: Spec.Spec;
  group: SpecSession.Group;
  project?: Project.Project;
  attendableId: string;
};

export const SpecCompanion: Role.Role<SpecCompanionData> = Role.make('org.dxos.plugin.projects.role.specCompanion');

/** Where a spec comes from (a branch, a pull request, its sync state) and what diff mode compares it with. */
export const SpecToolbar: Role.Role<{ subject: Spec.Spec }> = Role.make('org.dxos.plugin.projects.role.specToolbar');

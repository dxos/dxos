//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Role from '@dxos/app-framework/Role';
import type * as Project from '@dxos/compute/Project';

/**
 * Settings other plugins add to a project's overview, such as where its code lives on this device;
 * rendered inside the overview's form, so a contribution can use `Form.FieldSet`.
 */
export const Settings: Role.Role<{ project: Project.Project }> = Role.make('org.dxos.plugin.projects.role.settings');

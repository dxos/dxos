//
// Copyright 2026 DXOS.org
//

import { Role } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { ModuleRole, moduleSurfaces as commonSurfaces } from '@dxos/storybook-testing/modules';

import { ProjectModule, type ProjectModuleProps } from './ProjectModule';

export * from './ProjectModule';

/**
 * Custom roles for story panels with no equivalent composer plugin surface. Generic diagnostics
 * (config, database, logging, invocations, execution graph, routine) are spread in from
 * `ModuleRole`; object-bound panels use `Cell.article`/`Cell.companion` against real plugin
 * surfaces instead of a role here.
 */
export const StoryRole = {
  ...ModuleRole,

  Project: Role.make<ProjectModuleProps>('org.dxos.storybook.role.project'),
};

/** React surfaces for this package's panels, keyed by `StoryRole` tokens, plus the generic ones. */
export const moduleSurfaces: Surface.Definition[] = [
  ...commonSurfaces,

  Surface.create({
    id: 'role.project',
    filter: Surface.makeFilter(StoryRole.Project),
    component: ProjectModule,
  }),
];

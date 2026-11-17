//
// Copyright 2026 DXOS.org
//

import * as Role from '@dxos/app-framework/Role';
import * as Surface from '@dxos/app-framework/Surface';
import * as StoryModules from '@dxos/storybook-testing/StoryModules';

import { MailboxModule } from './MailboxModule.tsx';
import { ProjectModule, type ProjectModuleProps } from './ProjectModule.tsx';

export * from './MailboxModule.tsx';
export * from './ProjectModule.tsx';

/**
 * Custom roles for story panels with no equivalent composer plugin surface. Generic diagnostics
 * (config, database, logging, invocations, execution graph, routine) are spread in from
 * `StoryModules.Role`; object-bound panels use `Cell.article`/`Cell.companion` against real plugin
 * surfaces instead of a role here.
 */
export const StoryRole = {
  ...StoryModules.Role,

  Project: Role.make<ProjectModuleProps>('org.dxos.storybook.role.project'),
  Mailbox: Role.make<Record<string, never>>('org.dxos.storybook.role.mailbox'),
};

/** React surfaces for this package's panels, keyed by `StoryRole` tokens, plus the generic ones. */
export const moduleSurfaces: Surface.Definition[] = [
  ...StoryModules.surfaces,

  Surface.create({
    id: 'role.project',
    filter: Surface.makeFilter(StoryRole.Project),
    component: ProjectModule,
  }),

  Surface.create({
    id: 'role.mailbox',
    filter: Surface.makeFilter(StoryRole.Mailbox),
    component: MailboxModule,
  }),
];

//
// Copyright 2026 DXOS.org
//

import * as Role from '@dxos/app-framework/Role';
import { Surface } from '@dxos/app-framework/ui';
import { ModuleRole, moduleSurfaces as commonSurfaces } from '@dxos/storybook-testing/modules';

import { CommandModule } from './CommandModule.tsx';
import { ProcessesModule } from './ProcessesModule.tsx';

export * from './CommandModule.tsx';
export * from './ComputeContext.tsx';
export * from './ProcessesModule.tsx';

/** Roles for this package's story panels, plus the generic diagnostic ones. */
export const StoryRole = {
  ...ModuleRole,

  Command: Role.make<Record<string, never>>('org.dxos.storybook.role.compute.command'),
  Processes: Role.make<Record<string, never>>('org.dxos.storybook.role.compute.processes'),
};

/** React surfaces for this package's panels, keyed by `StoryRole` tokens, plus the generic ones. */
export const moduleSurfaces: Surface.Definition[] = [
  ...commonSurfaces,

  Surface.create({
    id: 'role.compute.command',
    filter: Surface.makeFilter(StoryRole.Command),
    component: CommandModule,
  }),

  Surface.create({
    id: 'role.compute.processes',
    filter: Surface.makeFilter(StoryRole.Processes),
    component: ProcessesModule,
  }),
];

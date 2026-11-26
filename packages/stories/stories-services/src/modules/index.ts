//
// Copyright 2026 DXOS.org
//

import * as Role from '@dxos/app-framework/Role';
import * as Surface from '@dxos/app-framework/Surface';
import * as StoryModules from '@dxos/storybook-testing/StoryModules';

import { HostsModule } from './HostsModule.tsx';
import { NotesModule } from './NotesModule.tsx';
import { SummarizerModule } from './SummarizerModule.tsx';

export * from './HostsModule.tsx';
export * from './NotesModule.tsx';
export * from './ServicesContext.tsx';
export * from './SummarizerModule.tsx';

/** Roles for this package's story panels, plus the generic diagnostic ones. */
export const StoryRole = {
  ...StoryModules.Role,
  Notes: Role.make<Record<string, never>>('org.dxos.storybook.role.services.notes'),
  Summarizer: Role.make<Record<string, never>>('org.dxos.storybook.role.services.summarizer'),
  Hosts: Role.make<Record<string, never>>('org.dxos.storybook.role.services.hosts'),
};

/** React surfaces for this package's panels, keyed by `StoryRole` tokens, plus the generic ones. */
export const moduleSurfaces: Surface.Definition[] = [
  ...StoryModules.surfaces,
  Surface.create({ id: 'role.services.notes', filter: Surface.makeFilter(StoryRole.Notes), component: NotesModule }),
  Surface.create({
    id: 'role.services.summarizer',
    filter: Surface.makeFilter(StoryRole.Summarizer),
    component: SummarizerModule,
  }),
  Surface.create({ id: 'role.services.hosts', filter: Surface.makeFilter(StoryRole.Hosts), component: HostsModule }),
];

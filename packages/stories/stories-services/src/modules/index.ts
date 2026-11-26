//
// Copyright 2026 DXOS.org
//

import * as Role from '@dxos/app-framework/Role';
import * as Surface from '@dxos/app-framework/Surface';
import * as StoryModules from '@dxos/storybook-testing/StoryModules';

import { LocalRuntimeModule } from './LocalRuntimeModule.tsx';
import { NotesModule } from './NotesModule.tsx';
import { RemoteRuntimeModule } from './RemoteRuntimeModule.tsx';
import { SummarizerModule } from './SummarizerModule.tsx';

export * from './HostCard.tsx';
export * from './LocalRuntimeModule.tsx';
export * from './NotesModule.tsx';
export * from './RemoteRuntimeModule.tsx';
export * from './ServicesContext.tsx';
export * from './SummarizerModule.tsx';

/** Roles for this package's story panels, plus the generic diagnostic ones. */
export const StoryRole = {
  ...StoryModules.Role,
  Notes: Role.make<Record<string, never>>('org.dxos.storybook.role.services.notes'),
  Summarizer: Role.make<Record<string, never>>('org.dxos.storybook.role.services.summarizer'),
  LocalRuntime: Role.make<Record<string, never>>('org.dxos.storybook.role.services.localRuntime'),
  RemoteRuntime: Role.make<Record<string, never>>('org.dxos.storybook.role.services.remoteRuntime'),
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
  Surface.create({
    id: 'role.services.localRuntime',
    filter: Surface.makeFilter(StoryRole.LocalRuntime),
    component: LocalRuntimeModule,
  }),
  Surface.create({
    id: 'role.services.remoteRuntime',
    filter: Surface.makeFilter(StoryRole.RemoteRuntime),
    component: RemoteRuntimeModule,
  }),
];

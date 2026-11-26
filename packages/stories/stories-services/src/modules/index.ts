//
// Copyright 2026 DXOS.org
//

import * as Role from '@dxos/app-framework/Role';
import * as Surface from '@dxos/app-framework/Surface';
import * as StoryModules from '@dxos/storybook-testing/StoryModules';

import { LocalRuntimeModule, RemoteRuntimeModule } from './RuntimeModule.tsx';
import { SettingsModule } from './SettingsModule.tsx';
import { SummarizerModule } from './SummarizerModule.tsx';

export * from './CallLog.tsx';
export * from './HostCard.tsx';
export * from './RuntimeModule.tsx';
export * from './ServicesContext.tsx';
export * from './SettingsModule.tsx';
export * from './SummarizerModule.tsx';

/** Roles for this package's story panels, plus the generic diagnostic ones. */
export const StoryRole = {
  ...StoryModules.Role,
  Settings: Role.make<Record<string, never>>('org.dxos.storybook.role.services.settings'),
  Summarizer: Role.make<Record<string, never>>('org.dxos.storybook.role.services.summarizer'),
  LocalRuntime: Role.make<Record<string, never>>('org.dxos.storybook.role.services.localRuntime'),
  RemoteRuntime: Role.make<Record<string, never>>('org.dxos.storybook.role.services.remoteRuntime'),
};

/** React surfaces for this package's panels, keyed by `StoryRole` tokens, plus the generic ones. */
export const moduleSurfaces: Surface.Definition[] = [
  ...StoryModules.surfaces,
  Surface.create({
    id: 'role.services.settings',
    filter: Surface.makeFilter(StoryRole.Settings),
    component: SettingsModule,
  }),
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

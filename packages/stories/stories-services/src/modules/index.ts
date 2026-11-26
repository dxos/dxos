//
// Copyright 2026 DXOS.org
//

import * as Role from '@dxos/app-framework/Role';
import * as Surface from '@dxos/app-framework/Surface';
import * as StoryModules from '@dxos/storybook-testing/StoryModules';

import { AppHostModule, EdgeHostModule, FrameHostModule } from './HostModule.tsx';
import { SettingsModule } from './SettingsModule.tsx';
import { SummarizerModule } from './SummarizerModule.tsx';

export * from './CallLog.tsx';
export * from './HostModule.tsx';
export * from './ServicesContext.tsx';
export * from './SettingsModule.tsx';
export * from './SummarizerModule.tsx';

/** Roles for this package's story panels, plus the generic diagnostic ones. */
export const StoryRole = {
  ...StoryModules.Role,
  Settings: Role.make<Record<string, never>>('org.dxos.storybook.role.services.settings'),
  Summarizer: Role.make<Record<string, never>>('org.dxos.storybook.role.services.summarizer'),
  AppHost: Role.make<Record<string, never>>('org.dxos.storybook.role.services.host.app'),
  FrameHost: Role.make<Record<string, never>>('org.dxos.storybook.role.services.host.frame'),
  EdgeHost: Role.make<Record<string, never>>('org.dxos.storybook.role.services.host.edge'),
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
    id: 'role.services.host.app',
    filter: Surface.makeFilter(StoryRole.AppHost),
    component: AppHostModule,
  }),
  Surface.create({
    id: 'role.services.host.frame',
    filter: Surface.makeFilter(StoryRole.FrameHost),
    component: FrameHostModule,
  }),
  Surface.create({
    id: 'role.services.host.edge',
    filter: Surface.makeFilter(StoryRole.EdgeHost),
    component: EdgeHostModule,
  }),
];

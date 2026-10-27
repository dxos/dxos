//
// Copyright 2026 DXOS.org
//

import * as Role from '@dxos/app-framework/Role';
import * as Surface from '@dxos/app-framework/Surface';
import { ModuleRole, moduleSurfaces as commonSurfaces } from '@dxos/storybook-testing/modules';

import { AgentPromptModule, AgentsModule } from './AgentModules.tsx';
import { CommandModule } from './CommandModule.tsx';
import {
  PermissionAgentsModule,
  PermissionConfiguratorModule,
  PermissionProcessTreeModule,
} from './PermissionModules.tsx';
import { ProcessesModule } from './ProcessesModule.tsx';

export * from './AgentContext.tsx';
export * from './AgentModules.tsx';
export * from './CommandModule.tsx';
export * from './ComputeContext.tsx';
export * from './PermissionContext.tsx';
export * from './PermissionModules.tsx';
export * from './process-context.tsx';
export * from './ProcessesModule.tsx';

/** Roles for this package's story panels, plus the generic diagnostic ones. */
export const StoryRole = {
  ...ModuleRole,

  Command: Role.make<Record<string, never>>('org.dxos.storybook.role.compute.command'),
  Processes: Role.make<Record<string, never>>('org.dxos.storybook.role.compute.processes'),
  AgentPrompt: Role.make<Record<string, never>>('org.dxos.storybook.role.compute.agentPrompt'),
  Agents: Role.make<Record<string, never>>('org.dxos.storybook.role.compute.agents'),
  PermissionConfigurator: Role.make<Record<string, never>>('org.dxos.storybook.role.compute.permissionConfigurator'),
  PermissionAgents: Role.make<Record<string, never>>('org.dxos.storybook.role.compute.permissionAgents'),
  PermissionProcesses: Role.make<Record<string, never>>('org.dxos.storybook.role.compute.permissionProcesses'),
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

  Surface.create({
    id: 'role.compute.agentPrompt',
    filter: Surface.makeFilter(StoryRole.AgentPrompt),
    component: AgentPromptModule,
  }),

  Surface.create({
    id: 'role.compute.agents',
    filter: Surface.makeFilter(StoryRole.Agents),
    component: AgentsModule,
  }),

  Surface.create({
    id: 'role.compute.permissionConfigurator',
    filter: Surface.makeFilter(StoryRole.PermissionConfigurator),
    component: PermissionConfiguratorModule,
  }),

  Surface.create({
    id: 'role.compute.permissionAgents',
    filter: Surface.makeFilter(StoryRole.PermissionAgents),
    component: PermissionAgentsModule,
  }),

  Surface.create({
    id: 'role.compute.permissionProcesses',
    filter: Surface.makeFilter(StoryRole.PermissionProcesses),
    component: PermissionProcessTreeModule,
  }),
];

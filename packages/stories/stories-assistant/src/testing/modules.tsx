//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Role } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { withModuleProps } from '@dxos/story-modules';

import {
  ChatModule,
  ChessModule,
  CommentsModule,
  ContextModule,
  DatabaseModule,
  EphemeralDebugModule,
  ExecutionGraphModule,
  GraphModule,
  InboxModule,
  InvocationsModule,
  MessageModule,
  ProjectModule,
  ResearchInputModule,
  ResearchOutputModule,
  RoutineCompanionModule,
  RoutineModule,
  ScriptModule,
  SkillModule,
  TasksModule,
  TestModule,
  TokenManagerModule,
  TraceModule,
  TriggersModule,
} from '../components';

/**
 * Role tokens for the stories-assistant modules. Each module is contributed as a dedicated
 * `Capabilities.ReactSurface` under its own role NSID (role-only dispatch), so a story layout is a
 * plain grid of these tokens; `ModuleContainer` injects the active space + attendable id into each
 * surface (`withModuleProps`).
 */
export const Module = {
  Chat: Role.make<Record<string, any>>('org.dxos.storybook.module.chat'),
  Chess: Role.make<Record<string, any>>('org.dxos.storybook.module.chess'),
  Comments: Role.make<Record<string, any>>('org.dxos.storybook.module.comments'),
  Context: Role.make<Record<string, any>>('org.dxos.storybook.module.context'),
  Database: Role.make<Record<string, any>>('org.dxos.storybook.module.database'),
  EphemeralDebug: Role.make<Record<string, any>>('org.dxos.storybook.module.ephemeralDebug'),
  ExecutionGraph: Role.make<Record<string, any>>('org.dxos.storybook.module.executionGraph'),
  Graph: Role.make<Record<string, any>>('org.dxos.storybook.module.graph'),
  Inbox: Role.make<Record<string, any>>('org.dxos.storybook.module.inbox'),
  Invocations: Role.make<Record<string, any>>('org.dxos.storybook.module.invocations'),
  Message: Role.make<Record<string, any>>('org.dxos.storybook.module.message'),
  Project: Role.make<Record<string, any>>('org.dxos.storybook.module.project'),
  ResearchInput: Role.make<Record<string, any>>('org.dxos.storybook.module.researchInput'),
  ResearchOutput: Role.make<Record<string, any>>('org.dxos.storybook.module.researchOutput'),
  Routine: Role.make<Record<string, any>>('org.dxos.storybook.module.routine'),
  RoutineCompanion: Role.make<Record<string, any>>('org.dxos.storybook.module.routineCompanion'),
  Script: Role.make<Record<string, any>>('org.dxos.storybook.module.script'),
  Skill: Role.make<Record<string, any>>('org.dxos.storybook.module.skill'),
  Tasks: Role.make<Record<string, any>>('org.dxos.storybook.module.tasks'),
  Test: Role.make<Record<string, any>>('org.dxos.storybook.module.test'),
  TokenManager: Role.make<Record<string, any>>('org.dxos.storybook.module.tokenManager'),
  Trace: Role.make<Record<string, any>>('org.dxos.storybook.module.trace'),
  Triggers: Role.make<Record<string, any>>('org.dxos.storybook.module.triggers'),
};

/**
 * React surfaces for the stories-assistant modules. Each module is registered under its own
 * `Module` role token (role-only dispatch), so a story layout is a plain grid of `Module.*` tokens.
 */
export const moduleSurfaces: Surface.Definition[] = [
  Surface.create({
    id: 'module.chat',
    filter: Surface.makeFilter(Module.Chat),
    component: withModuleProps(ChatModule),
  }),
  Surface.create({
    id: 'module.chess',
    filter: Surface.makeFilter(Module.Chess),
    component: withModuleProps(ChessModule),
  }),
  Surface.create({
    id: 'module.comments',
    filter: Surface.makeFilter(Module.Comments),
    component: withModuleProps(CommentsModule),
  }),
  Surface.create({
    id: 'module.context',
    filter: Surface.makeFilter(Module.Context),
    component: () => <ContextModule />,
  }),
  Surface.create({
    id: 'module.database',
    filter: Surface.makeFilter(Module.Database),
    component: withModuleProps(DatabaseModule),
  }),
  Surface.create({
    id: 'module.ephemeralDebug',
    filter: Surface.makeFilter(Module.EphemeralDebug),
    component: withModuleProps(EphemeralDebugModule),
  }),
  Surface.create({
    id: 'module.executionGraph',
    filter: Surface.makeFilter(Module.ExecutionGraph),
    component: withModuleProps(ExecutionGraphModule),
  }),
  Surface.create({
    id: 'module.graph',
    filter: Surface.makeFilter(Module.Graph),
    component: withModuleProps(GraphModule),
  }),
  Surface.create({
    id: 'module.inbox',
    filter: Surface.makeFilter(Module.Inbox),
    component: withModuleProps(InboxModule),
  }),
  Surface.create({
    id: 'module.invocations',
    filter: Surface.makeFilter(Module.Invocations),
    component: withModuleProps(InvocationsModule),
  }),
  Surface.create({
    id: 'module.message',
    filter: Surface.makeFilter(Module.Message),
    component: withModuleProps(MessageModule),
  }),
  Surface.create({
    id: 'module.project',
    filter: Surface.makeFilter(Module.Project),
    component: withModuleProps(ProjectModule),
  }),
  Surface.create({
    id: 'module.researchInput',
    filter: Surface.makeFilter(Module.ResearchInput),
    component: withModuleProps(ResearchInputModule),
  }),
  Surface.create({
    id: 'module.researchOutput',
    filter: Surface.makeFilter(Module.ResearchOutput),
    component: withModuleProps(ResearchOutputModule),
  }),
  Surface.create({
    id: 'module.routine',
    filter: Surface.makeFilter(Module.Routine),
    component: withModuleProps(RoutineModule),
  }),
  Surface.create({
    id: 'module.routineCompanion',
    filter: Surface.makeFilter(Module.RoutineCompanion),
    component: withModuleProps(RoutineCompanionModule),
  }),
  Surface.create({
    id: 'module.script',
    filter: Surface.makeFilter(Module.Script),
    component: withModuleProps(ScriptModule),
  }),
  Surface.create({
    id: 'module.skill',
    filter: Surface.makeFilter(Module.Skill),
    component: withModuleProps(SkillModule),
  }),
  Surface.create({
    id: 'module.tasks',
    filter: Surface.makeFilter(Module.Tasks),
    component: withModuleProps(TasksModule),
  }),
  Surface.create({ id: 'module.test', filter: Surface.makeFilter(Module.Test), component: () => <TestModule /> }),
  Surface.create({
    id: 'module.tokenManager',
    filter: Surface.makeFilter(Module.TokenManager),
    component: () => <TokenManagerModule />,
  }),
  Surface.create({ id: 'module.trace', filter: Surface.makeFilter(Module.Trace), component: () => <TraceModule /> }),
  Surface.create({
    id: 'module.triggers',
    filter: Surface.makeFilter(Module.Triggers),
    component: () => <TriggersModule />,
  }),
];

//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Role } from '@dxos/app-framework';

//
// Role tokens for the stories-assistant modules. Each module is contributed as a
// dedicated `Capabilities.ReactSurface` under its own role NSID (role-only
// dispatch), so a story layout is a plain grid of these tokens and each surface
// resolves the active space via `useActiveSpace()` rather than prop-drilling.
//

export const Chat = Role.make('org.dxos.storybook.module.chat');
export const Chess = Role.make('org.dxos.storybook.module.chess');
export const Comments = Role.make('org.dxos.storybook.module.comments');
export const Context = Role.make('org.dxos.storybook.module.context');
export const Database = Role.make('org.dxos.storybook.module.database');
export const EphemeralDebug = Role.make('org.dxos.storybook.module.ephemeralDebug');
export const ExecutionGraph = Role.make('org.dxos.storybook.module.executionGraph');
export const Graph = Role.make('org.dxos.storybook.module.graph');
export const Inbox = Role.make('org.dxos.storybook.module.inbox');
export const Invocations = Role.make('org.dxos.storybook.module.invocations');
export const Message = Role.make('org.dxos.storybook.module.message');
export const Project = Role.make('org.dxos.storybook.module.project');
export const ResearchInput = Role.make('org.dxos.storybook.module.researchInput');
export const ResearchOutput = Role.make('org.dxos.storybook.module.researchOutput');
export const Routine = Role.make('org.dxos.storybook.module.routine');
export const RoutineCompanion = Role.make('org.dxos.storybook.module.routineCompanion');
export const Script = Role.make('org.dxos.storybook.module.script');
export const Skill = Role.make('org.dxos.storybook.module.skill');
export const Tasks = Role.make('org.dxos.storybook.module.tasks');
export const Test = Role.make('org.dxos.storybook.module.test');
export const TokenManager = Role.make('org.dxos.storybook.module.tokenManager');
export const Trace = Role.make('org.dxos.storybook.module.trace');
export const Triggers = Role.make('org.dxos.storybook.module.triggers');

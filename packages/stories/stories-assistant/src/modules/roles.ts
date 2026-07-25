//
// Copyright 2026 DXOS.org
//

import { Role } from '@dxos/app-framework';

/**
 * Custom roles for story panels that are NOT bound to a story-created object — the harness chat and
 * the bespoke diagnostics that have no equivalent composer plugin surface. Object-bound panels
 * (documents, sketches, games, …) use `Cell.article`/`Cell.companion` against the real plugin
 * surfaces instead of a role here.
 */
export const StoryRole = {
  Chat: Role.make<Record<string, any>>('org.dxos.storybook.role.chat'),
  Context: Role.make<Record<string, any>>('org.dxos.storybook.role.context'),
  Database: Role.make<Record<string, any>>('org.dxos.storybook.role.database'),
  ExecutionGraph: Role.make<Record<string, any>>('org.dxos.storybook.role.executionGraph'),
  Graph: Role.make<Record<string, any>>('org.dxos.storybook.role.graph'),
  Invocations: Role.make<Record<string, any>>('org.dxos.storybook.role.invocations'),
  Logging: Role.make<Record<string, any>>('org.dxos.storybook.role.logging'),
  ResearchInput: Role.make<Record<string, any>>('org.dxos.storybook.role.researchInput'),
  ResearchOutput: Role.make<Record<string, any>>('org.dxos.storybook.role.researchOutput'),
  Routine: Role.make<Record<string, any>>('org.dxos.storybook.role.routine'),
  Tasks: Role.make<Record<string, any>>('org.dxos.storybook.role.tasks'),
};

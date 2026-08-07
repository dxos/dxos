//
// Copyright 2026 DXOS.org
//

import { Role } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';

import { ConfigModule } from './ConfigModule';
import { DatabaseModule } from './DatabaseModule';
import { ExecutionGraphModule } from './ExecutionGraphModule';
import { InvocationsModule } from './InvocationsModule';
import { LoggingModule } from './LoggingModule';
import { RoutineModule } from './RoutineModule';

export * from './ConfigModule';
export * from './DatabaseModule';
export * from './ExecutionGraphModule';
export * from './InvocationsModule';
export * from './LoggingModule';
export * from './RoutineModule';

/**
 * Roles for the generic diagnostic modules in this package, colocated with their components so a
 * consumer registers them as story-only surfaces (`Surface.makeFilter(ModuleRole.X)`) and references
 * them from a layout via the same token.
 */
export const ModuleRole = {
  Config: Role.make<Record<string, unknown>>('org.dxos.storybook.role.config'),
  Database: Role.make<Record<string, unknown>>('org.dxos.storybook.role.database'),
  ExecutionGraph: Role.make<Record<string, unknown>>('org.dxos.storybook.role.executionGraph'),
  Invocations: Role.make<Record<string, unknown>>('org.dxos.storybook.role.invocations'),
  Logging: Role.make<Record<string, unknown>>('org.dxos.storybook.role.logging'),
  Routine: Role.make<Record<string, unknown>>('org.dxos.storybook.role.routine'),
};

/**
 * Surfaces for the generic diagnostic modules, keyed by their `ModuleRole` tokens. A consumer
 * spreads these into its own surface list so stories can reference them as bare `ModuleRole.X`
 * tokens in a layout without re-registering each component.
 */
export const moduleSurfaces: Surface.Definition[] = [
  Surface.create({
    id: 'role.config',
    filter: Surface.makeFilter(ModuleRole.Config),
    component: ConfigModule,
  }),
  Surface.create({
    id: 'role.database',
    filter: Surface.makeFilter(ModuleRole.Database),
    component: DatabaseModule,
  }),
  Surface.create({
    id: 'role.executionGraph',
    filter: Surface.makeFilter(ModuleRole.ExecutionGraph),
    component: ExecutionGraphModule,
  }),
  Surface.create({
    id: 'role.invocations',
    filter: Surface.makeFilter(ModuleRole.Invocations),
    component: InvocationsModule,
  }),
  Surface.create({
    id: 'role.logging',
    filter: Surface.makeFilter(ModuleRole.Logging),
    component: LoggingModule,
  }),
  Surface.create({
    id: 'role.routine',
    filter: Surface.makeFilter(ModuleRole.Routine),
    component: RoutineModule,
  }),
];

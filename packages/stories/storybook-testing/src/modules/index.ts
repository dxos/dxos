//
// Copyright 2026 DXOS.org
//

import * as Role from '@dxos/app-framework/Role';
import * as Surface from '@dxos/app-framework/Surface';

import { ConfigModule } from './ConfigModule.tsx';
import { DatabaseModule } from './DatabaseModule.tsx';
import { ExecutionGraphModule } from './ExecutionGraphModule.tsx';
import { InvocationsModule } from './InvocationsModule.tsx';
import { JsonModule } from './JsonModule.tsx';
import { LoggingModule } from './LoggingModule.tsx';
import { ObjectsModule } from './ObjectsModule.tsx';
import { RoutineModule } from './RoutineModule.tsx';

export * from './ConfigModule.tsx';
export * from './DatabaseModule.tsx';
export * from './ExecutionGraphModule.tsx';
export * from './InvocationsModule.tsx';
export * from './JsonModule.tsx';
export * from './LoggingModule.tsx';
export * from './ObjectsModule.tsx';
export * from './RoutineModule.tsx';

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
  Json: Role.make<Record<string, unknown>>('org.dxos.storybook.role.json'),
  Logging: Role.make<Record<string, unknown>>('org.dxos.storybook.role.logging'),
  Objects: Role.make<Record<string, unknown>>('org.dxos.storybook.role.objects'),
  Routine: Role.make<Record<string, unknown>>('org.dxos.storybook.role.routine'),
};

/**
 * Surfaces for the generic diagnostic modules, keyed by their `ModuleRole` tokens. A consumer
 * spreads these into its own surface list so stories can reference them as bare `ModuleRole.X`
 * tokens in a layout without re-registering each component.
 */
export const moduleSurfaces: Surface.Root.Definition[] = [
  Surface.Root.create({
    id: 'role.config',
    filter: Surface.Root.makeFilter(ModuleRole.Config),
    component: ConfigModule,
  }),
  Surface.Root.create({
    id: 'role.database',
    filter: Surface.Root.makeFilter(ModuleRole.Database),
    component: DatabaseModule,
  }),
  Surface.Root.create({
    id: 'role.executionGraph',
    filter: Surface.Root.makeFilter(ModuleRole.ExecutionGraph),
    component: ExecutionGraphModule,
  }),
  Surface.Root.create({
    id: 'role.invocations',
    filter: Surface.Root.makeFilter(ModuleRole.Invocations),
    component: InvocationsModule,
  }),
  Surface.Root.create({
    id: 'role.json',
    filter: Surface.Root.makeFilter(ModuleRole.Json),
    component: JsonModule,
  }),
  Surface.Root.create({
    id: 'role.logging',
    filter: Surface.Root.makeFilter(ModuleRole.Logging),
    component: LoggingModule,
  }),
  Surface.Root.create({
    id: 'role.objects',
    filter: Surface.Root.makeFilter(ModuleRole.Objects),
    component: ObjectsModule,
  }),
  Surface.Root.create({
    id: 'role.routine',
    filter: Surface.Root.makeFilter(ModuleRole.Routine),
    component: RoutineModule,
  }),
];

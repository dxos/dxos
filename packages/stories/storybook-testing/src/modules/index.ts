//
// Copyright 2026 DXOS.org
//

import { Role } from '@dxos/app-framework';

export * from './ExecutionGraphModule';
export * from './InvocationsModule';
export * from './LoggingModule';

/**
 * Roles for the generic diagnostic modules in this package, colocated with their components so a
 * consumer registers them as story-only surfaces (`Surface.makeFilter(ModuleRole.X)`) and references
 * them from a layout via the same token.
 */
export const ModuleRole = {
  ExecutionGraph: Role.make<Record<string, any>>('org.dxos.storybook.role.executionGraph'),
  Invocations: Role.make<Record<string, any>>('org.dxos.storybook.role.invocations'),
  Logging: Role.make<Record<string, any>>('org.dxos.storybook.role.logging'),
};

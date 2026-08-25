//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { describe, test } from 'vitest';

import { OpaqueToolkit, ToolId, ToolResolverService } from '@dxos/ai';
import { makeToolResolverFromOperations } from '@dxos/assistant';
import { ProjectSkill } from '@dxos/assistant-toolkit';
import * as Operation from '@dxos/compute/Operation';
import { Registry } from '@dxos/echo';
import { makeRegistry } from '@dxos/echo-client';
import { EffectEx } from '@dxos/effect';
import * as OutlineOperation from '@dxos/plugin-tasks/OutlineOperation';
import * as TaskOperation from '@dxos/plugin-tasks/TaskOperation';

import { ProjectMcpOperation, ProjectOperation } from '#types';

// The skill sits below these packages and names their verbs as strings, so a re-key there would rot
// the list silently; this is the only place both the skill and the real definitions are visible.
const DEFINITIONS: readonly Operation.Definition.Any[] = [
  ProjectOperation.Create,
  ProjectMcpOperation.ListProjects,
  ProjectMcpOperation.GetProject,
  ProjectMcpOperation.UpdateProject,
  TaskOperation.CreateTask,
  TaskOperation.UpdateTask,
  TaskOperation.CompleteTask,
  TaskOperation.AssignTask,
  TaskOperation.ListTasks,
  TaskOperation.CreateMilestone,
  TaskOperation.UpdateMilestone,
  TaskOperation.DeleteMilestone,
  TaskOperation.ListMilestones,
  OutlineOperation.GetOutline,
  OutlineOperation.UpdateOutline,
];

/** Every operation behind the skill: the plugin verbs it names plus the artifact verbs it owns. */
const ALL_DEFINITIONS: readonly Operation.Definition.Any[] = [...DEFINITIONS, ...(ProjectSkill.operations ?? [])];

describe('project skill tools', () => {
  test('every plugin verb the skill names resolves to a real operation', ({ expect }) => {
    const declared = new Set<string>(ProjectSkill.make().tools);
    const missing = DEFINITIONS.map((op) => Operation.toolName(op)).filter((name) => !declared.has(name));
    expect(missing).toEqual([]);
  });

  test('and the skill names nothing that has no operation behind it', ({ expect }) => {
    // The reverse direction: a typo in the string list would otherwise sit there unnoticed, since a
    // name nothing answers is dropped from the session toolkit rather than reported.
    const real = new Set(ALL_DEFINITIONS.map((op) => Operation.toolName(op)));
    const unbacked = [...ProjectSkill.make().tools].filter((name) => !real.has(name));
    expect(unbacked).toEqual([]);
  });

  test('every declared tool resolves against a registry carrying those operations', async ({ expect }) => {
    // `resolveToolkit` drops what it cannot resolve — a bad name, or an operation whose persisted
    // schema will not project to tool parameters — and only logs. So a verb can be correctly named
    // and still never reach the model. Resolving each one here is what makes that visible.
    const registry = makeRegistry({ initial: ALL_DEFINITIONS.map((op) => Operation.serialize(op)) });
    const declared = [...ProjectSkill.make().tools];

    const resolved = await EffectEx.runPromise(
      Effect.gen(function* () {
        const resolver = yield* ToolResolverService;
        return yield* Effect.forEach(declared, (name) =>
          resolver.resolve(ToolId.make(name)).pipe(
            Effect.map((tool) => tool.name),
            Effect.orElseSucceed(() => `UNRESOLVED: ${name}`),
          ),
        );
      }).pipe(
        Effect.provide(makeToolResolverFromOperations().pipe(Layer.provide(Layer.succeed(Registry.Service, registry)))),
        Effect.provide(OpaqueToolkit.providerLayer(OpaqueToolkit.empty)),
      ),
    );

    expect(resolved.filter((name) => name.startsWith('UNRESOLVED'))).toEqual([]);
    expect(resolved.sort()).toEqual([...declared].sort());
  });
});

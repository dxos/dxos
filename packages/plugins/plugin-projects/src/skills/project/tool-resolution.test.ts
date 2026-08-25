//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { describe, test } from 'vitest';

import { OpaqueToolkit, ToolId, ToolResolverService } from '@dxos/ai';
import { makeToolResolverFromOperations } from '@dxos/assistant';
import * as Operation from '@dxos/compute/Operation';
import { Registry } from '@dxos/echo';
import { makeRegistry } from '@dxos/echo-client';
import { EffectEx } from '@dxos/effect';

import instructions from './project-skill.md?raw';
import ProjectSkill, { operations } from './skill';

/** Backticked tokens in the workflow prose that are shaped like one of our tool names. */
const NAMED_TOOL = /`(projects-[a-z-]+|tasks-[a-z-]+|space-[a-z-]+)\b/g;

describe('project skill tools', () => {
  test('every declared tool resolves against a registry carrying those operations', async ({ expect }) => {
    // The skill imports its operations, so naming is the compiler's problem now. This covers what
    // the compiler cannot: `resolveToolkit` drops an operation whose persisted schema will not
    // project to tool parameters, and only logs — so a verb can be correctly declared and still
    // never reach the model.
    const registry = makeRegistry({ initial: operations.map((op) => Operation.serialize(op)) });
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

  test('the workflow prose names no tool the skill does not declare', ({ expect }) => {
    // The prose is markdown, so it cannot interpolate `Operation.toolName`; this is what keeps it
    // from telling the model to call something that is not in its toolkit.
    const declared = new Set<string>(ProjectSkill.make().tools);
    const mentioned = [...instructions.matchAll(NAMED_TOOL)].map(([, name]) => name);
    expect([...new Set(mentioned.filter((name) => !declared.has(name)))]).toEqual([]);
  });
});

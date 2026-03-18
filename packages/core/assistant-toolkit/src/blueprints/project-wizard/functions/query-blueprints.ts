//
// Copyright 2025 DXOS.org
//

import { Blueprint } from '@dxos/blueprints';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { defineFunction } from '@dxos/functions';

// TODO(dmaretskyi): Remove this with proper function typing.
const fixEffectType = <A, E, R>(
  eff: Effect.Effect<A, E, R>,
): Effect.Effect<A, E, Exclude<R, Blueprint.RegistryService>> => eff as any;

export default defineFunction({
  key: 'org.dxos.function.project-wizard.query-blueprints',
  name: 'Query blueprints',
  description: 'Queries the blueprints.',
  inputSchema: Schema.Struct({}),
  outputSchema: Schema.Array(Blueprint.Blueprint),
  services: [Blueprint.RegistryService],
  handler: Effect.fnUntraced(function* ({ data }) {
    const registry = yield* Blueprint.RegistryService;
    return registry.query();
  }, fixEffectType),
});

//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { Obj, Ref } from '@dxos/echo';
import { Blueprint } from '@dxos/blueprints';

import { defineFunction } from '@dxos/functions';

import { Project } from '../../../types';
import { ProjectBlueprint, syncProjectTriggers } from '../../project';

// TODO(dmaretskyi): Remove this with proper function typing.
const fixEffectType = <A, E, R>(
  eff: Effect.Effect<A, E, R>,
): Effect.Effect<A, E, Exclude<R, Blueprint.RegistryService>> => eff as any;

export default defineFunction({
  key: 'org.dxos.function.project-wizard.create-project',
  name: 'Create project',
  description: 'Creates a new project.',
  inputSchema: Schema.Struct({
    name: Schema.String.annotations({
      description: 'The name of the project to create.',
    }),
    spec: Schema.String.annotations({
      description:
        'The goal of the project. Be specic but not to verbose. The agent will use this as a core objective and set of rules to follow.',
    }),
    blueprints: Schema.Array(Schema.String).annotations({
      description: 'The keys blueprints to use for the project.',
      examples: [['org.dxos.blueprint.markdown', 'org.dxos.blueprint.database']],
    }),
    subscriptions: Schema.Array(Ref.Ref(Obj.Unknown)).annotations({
      description: 'The objects to subscribe to for the project. Can be references to mailboxes.',
    }),
  }),
  outputSchema: Project.Project,
  services: [Blueprint.RegistryService],
  handler: Effect.fnUntraced(function* ({ data }) {
    const project = yield* Project.makeInitialized(
      {
        name: data.name,
        spec: data.spec,
        blueprints: yield* Effect.forEach(data.blueprints, (key) =>
          Blueprint.upsert(key).pipe(Effect.map(Ref.make), Effect.orDie),
        ),
        subscriptions: data.subscriptions,
      },
      Obj.clone(ProjectBlueprint.make()),
    );
    yield* syncProjectTriggers(project);
    return project;
  }, fixEffectType),
});

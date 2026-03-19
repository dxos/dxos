//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Blueprint } from '@dxos/blueprints';
import { Database, Obj, Ref } from '@dxos/echo';
import { QueueService } from '@dxos/functions';
import { Operation } from '@dxos/operation';

import { CreateProject } from './definitions';
import { Project } from '../../../types';
import { ProjectBlueprint, syncProjectTriggers } from '../../project';

// TODO(dmaretskyi): Remove this with proper function typing.
const fixEffectType = <A, E, R>(
  eff: Effect.Effect<A, E, R>,
): Effect.Effect<A, E, Exclude<R, Blueprint.RegistryService | Database.Service | QueueService>> => eff as any;

export default CreateProject.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ name, spec, blueprints, subscriptions }) {
      const project = yield* Project.makeInitialized(
        {
          name,
          spec,
          blueprints: yield* Effect.forEach(blueprints, (key) =>
            Blueprint.upsert(key).pipe(Effect.map(Ref.make), Effect.orDie),
          ),
          subscriptions,
        },
        Obj.clone(ProjectBlueprint.make()),
      );
      yield* syncProjectTriggers(project);
      return project;
    }, fixEffectType),
  ),
);

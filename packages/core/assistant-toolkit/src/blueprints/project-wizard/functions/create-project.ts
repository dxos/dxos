//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Blueprint } from '@dxos/blueprints';
import { Obj, Ref } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { CreateProject } from './definitions';
import { Project } from '../../../types';
import { ProjectBlueprint, SyncTriggers } from '../../project';

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
      yield* Operation.invoke(SyncTriggers, { project: Ref.make(project) });
      return project;
    }),
  ),
);

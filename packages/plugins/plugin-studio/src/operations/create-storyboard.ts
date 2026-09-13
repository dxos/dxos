//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj, Ref } from '@dxos/echo';

import { Storyboard, StudioOperation } from '#types';

const handler: Operation.WithHandler<typeof StudioOperation.CreateStoryboard> = StudioOperation.CreateStoryboard.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ name, project: projectRef }) {
      const storyboard = yield* Database.add(Storyboard.make({ name }));
      if (projectRef) {
        // Filed by ref, not parented: an artifact outlives its project like every other project artifact.
        const project = yield* Database.load(projectRef);
        Obj.update(project, (project) => {
          project.artifacts.push(Ref.make(storyboard));
        });
      }
      yield* Database.flush();
      return { storyboard: Ref.make(storyboard) };
    }),
  ),
  Operation.opaqueHandler,
);

export default handler;

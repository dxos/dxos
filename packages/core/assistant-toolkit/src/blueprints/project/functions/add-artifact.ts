//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Obj } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { Project } from '../../../types';
import { AddArtifact } from './definitions';

export default AddArtifact.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ name, artifact }) {
      if (!(yield* Database.load(artifact))) {
        throw new Error('Artifact not found.');
      }

      const project = yield* Project.getFromChatContext;

      Obj.change(project, (project) => {
        project.artifacts.push({
          name,
          data: artifact,
        });
      });
    }) as any,
  ),
);

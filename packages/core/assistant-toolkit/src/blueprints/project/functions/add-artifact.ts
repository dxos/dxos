//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Obj } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { Agent } from '../../../types';
import { AddArtifact } from './definitions';

export default AddArtifact.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ name, artifact }) {
      if (!(yield* Database.load(artifact))) {
        throw new Error('Artifact not found.');
      }

      const agent = yield* Agent.getFromChatContext;

      Obj.change(agent, (agent) => {
        agent.artifacts.push({
          name,
          data: artifact,
        });
      });
    }) as any,
  ),
);

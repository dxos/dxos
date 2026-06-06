//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';

import { Agent } from '../../../types';
import { AddArtifact } from './definitions';

export default AddArtifact.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ name, artifact }) {
      const agent = yield* Agent.getFromChatContext;
      yield* Agent.addArtifact(agent, { name, id: artifact });
    }),
  ),
  Operation.opaqueHandler,
);

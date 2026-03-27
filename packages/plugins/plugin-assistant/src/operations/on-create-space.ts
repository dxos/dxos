//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { AgentPrompt } from '@dxos/assistant-toolkit';
import { Operation } from '@dxos/operation';

import { CreateChat, OnCreateSpace } from './definitions';

const handler: Operation.WithHandler<typeof OnCreateSpace> = OnCreateSpace.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ space }) {
      // TODO(wittjosiah): Remove once function registry is avaiable.
      space.db.add(Operation.serialize(AgentPrompt));

      const { object: chat } = yield* Operation.invoke(CreateChat, { db: space.db });
      space.db.add(chat);
    }),
  ),
);

export default handler;

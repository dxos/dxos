//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { AgentPrompt } from '@dxos/assistant-toolkit';
import { Operation } from '@dxos/compute';

import { AssistantOperation } from '#types';

const handler: Operation.WithHandler<typeof AssistantOperation.OnCreateSpace> = AssistantOperation.OnCreateSpace.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ space }) {
      // TODO(wittjosiah): Remove once function registry is avaiable.
      space.db.add(Operation.serialize(AgentPrompt));

      const { object: chat } = yield* Operation.invoke(AssistantOperation.CreateChat, { db: space.db });
      space.db.add(chat);
    }),
  ),
);

export default handler;

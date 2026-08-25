//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';

import { sendUserMessage } from '#api';
import { ClaudeAgentOperation } from '#types';

import { getApiKey } from '../credentials';

const handler: Operation.WithHandler<typeof ClaudeAgentOperation.SendMessage> = ClaudeAgentOperation.SendMessage.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ session, message }) {
      const sessionObj = yield* Database.load(session);
      const apiKey = yield* getApiKey;
      yield* sendUserMessage(apiKey, sessionObj.sessionId, message);

      return { sessionId: sessionObj.sessionId };
    }),
  ),
);

export default handler;

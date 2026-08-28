//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';

import { sendUserMessage } from '#api';
import { ClaudeAgentOperation, ClaudeAgentSession } from '#types';

import { getApiKey } from '../credentials';
import { SessionNotLinkedError } from '../errors';

const handler: Operation.WithHandler<typeof ClaudeAgentOperation.SendMessage> = ClaudeAgentOperation.SendMessage.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ session, message }) {
      const sessionObj = yield* Database.load(session);
      const sessionId = ClaudeAgentSession.getSessionId(sessionObj);
      if (!sessionId) {
        return yield* Effect.fail(new SessionNotLinkedError());
      }

      const apiKey = yield* getApiKey;
      yield* sendUserMessage(apiKey, sessionId, message);

      return { sessionId };
    }),
  ),
);

export default handler;

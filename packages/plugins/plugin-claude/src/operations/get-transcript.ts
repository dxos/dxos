//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';

import { getSession, listEvents, toTranscript } from '#api';
import { ClaudeAgentOperation, ClaudeAgentSession } from '#types';

import { DEFAULT_TRANSCRIPT_LIMIT } from '../constants';
import { getApiKey } from '../credentials';
import { SessionNotLinkedError } from '../errors';

const handler: Operation.WithHandler<typeof ClaudeAgentOperation.GetTranscript> =
  ClaudeAgentOperation.GetTranscript.pipe(
    Operation.withHandler(
      Effect.fn(function* ({ session, limit, order }) {
        const sessionObj = yield* Database.load(session);
        const sessionId = ClaudeAgentSession.getSessionId(sessionObj);
        if (!sessionId) {
          return yield* Effect.fail(new SessionNotLinkedError());
        }

        const apiKey = yield* getApiKey;

        const [state, events] = yield* Effect.all(
          [getSession(apiKey, sessionId), listEvents(apiKey, sessionId, limit ?? DEFAULT_TRANSCRIPT_LIMIT, order)],
          { concurrency: 2 },
        );

        const stopReason = state.stop_reason?.type;
        Obj.update(sessionObj, (sessionObj) => {
          sessionObj.status = state.status;
          sessionObj.stopReason = stopReason;
        });

        return { status: state.status, stopReason, messages: toTranscript(events.data ?? []) };
      }),
    ),
  );

export default handler;

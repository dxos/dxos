//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Credential from '@dxos/compute/Credential';
import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';

import { getSession, listEvents, toTranscript } from '#api';
import { ClaudeAgentOperation } from '#types';

import { ANTHROPIC_SOURCE, DEFAULT_TRANSCRIPT_LIMIT } from '../constants';

const handler: Operation.WithHandler<typeof ClaudeAgentOperation.GetTranscript> =
  ClaudeAgentOperation.GetTranscript.pipe(
    Operation.withHandler(
      Effect.fn(function* ({ session, limit }) {
        const sessionObj = yield* Database.load(session);
        const apiKey = yield* Credential.getApiKeyValue({ service: ANTHROPIC_SOURCE });

        const [state, events] = yield* Effect.all(
          [
            getSession(apiKey, sessionObj.sessionId),
            listEvents(apiKey, sessionObj.sessionId, limit ?? DEFAULT_TRANSCRIPT_LIMIT),
          ],
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

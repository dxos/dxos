//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

/** The canned reply, which a play test waits for. */
export const FAKE_REPLY = 'ok';

/** Long enough for the review plugin's pending message to be seen before the reply replaces it. */
const FAKE_LATENCY = '1500 millis';

/**
 * Stands in for the assistant's comment runner: after a short pause (the review plugin shows its pending message
 * meanwhile, as for the real agent) it returns a canned reply, with no model, so a story runs offline and
 * deterministically.
 */
export const fakeCommentAgent: AppCapabilities.CommentAgentRunner = {
  run: () => Effect.sleep(FAKE_LATENCY).pipe(Effect.as(FAKE_REPLY)),
};

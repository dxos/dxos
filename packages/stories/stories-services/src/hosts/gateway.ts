//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { type Summarizer } from '../contracts/index.ts';

/**
 * A stand-in for the AI gateway: a canned token stream that names the host it ran in, so the
 * consumer's output shows which provider answered.
 */
export const fakeGateway = (hostId: string, delayMs = 40): Summarizer.Gateway => ({
  complete: (prompt) => {
    const words = prompt.replace(/^Summarize:\s*/, '').split(/\s+/).filter(Boolean);
    const tokens = [`[${hostId}]`, `${words.length} words:`, ...words.slice(0, 6), words.length > 6 ? '...' : ''];
    return Stream.fromIterable(tokens.filter(Boolean)).pipe(
      Stream.mapEffect((token) => Effect.as(Effect.sleep(`${delayMs} millis`), token)),
    );
  },
});

//
// Copyright 2026 DXOS.org
//

import * as Stream from 'effect/Stream';
import { describe, expect, test } from 'vitest';

import { EffectEx } from '@dxos/effect';
import { ContentBlock, Message } from '@dxos/types';

import * as Host from './Host';

/** Spawns the real SDK and spends real tokens, so it is opt-in: `moon run agent-claude:demo`. */
const ENABLED = !!process.env.DX_RUN_LIVE;

describe.skipIf(!ENABLED)('Demo (live)', () => {
  test('runs a turn and projects it', { timeout: 120_000 }, async () => {
    const session = new Host.Session();
    const messages = await EffectEx.runPromise(
      Stream.runCollect(
        session.run({
          prompt: 'Reply with exactly the word OK. Do not use any tools.',
          cwd: import.meta.dirname,
          maxTurns: 1,
        }),
      ),
    );

    const collected = Array.from(messages);
    for (const message of collected) {
      // eslint-disable-next-line no-console
      console.log(message.sender.role, JSON.stringify(message.blocks));
    }

    expect(collected.length).to.be.greaterThan(0);
    const text = collected
      .filter((message) => message.sender.role === 'assistant')
      .map((message) => Message.extractText(message))
      .join('');
    expect(text).to.contain('OK');

    const stats = collected.at(-1)?.blocks.find((block) => block._tag === 'stats') as ContentBlock.Stats | undefined;
    expect(stats?.duration).to.be.a('number');
    expect(session.denials).to.have.length(0);
  });
});

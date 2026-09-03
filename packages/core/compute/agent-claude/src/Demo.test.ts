//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';
import { describe, expect, test } from 'vitest';

import { EffectEx } from '@dxos/effect';
import { ContentBlock, Message } from '@dxos/types';

import * as Host from './Host.ts';

/** Spawns the real SDK and spends real tokens, so it is opt-in: `moon run agent-claude:demo`. */
const ENABLED = !!process.env.DX_RUN_LIVE;

/** Collects a turn's assistant text, which is what these assertions are about. */
const runText = (session: Host.Session, prompt: string) =>
  Stream.runCollect(session.run({ prompt, cwd: import.meta.dirname, maxTurns: 2 })).pipe(
    Effect.map((messages) =>
      Array.from(messages)
        .filter((message) => message.sender.role === 'assistant')
        .map((message) => Message.extractText(message))
        .join(''),
    ),
  );

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
    expect(session.sessionId, 'no session id was captured').to.be.a('string');
  });

  test('a second turn continues the first', { timeout: 180_000 }, async () => {
    const session = new Host.Session();
    await EffectEx.runPromise(runText(session, 'Remember the word pelican. Reply with exactly OK.'));
    const sessionId = session.sessionId;
    expect(sessionId).to.be.a('string');

    // Only a resumed session can answer this; a fresh one has never seen the word.
    const answer = await EffectEx.runPromise(
      runText(session, 'What word did I ask you to remember? Reply with just that word.'),
    );
    expect(answer.toLowerCase(), 'the second turn did not see the first').to.contain('pelican');
    expect(session.sessionId, 'continuing should not change the session').to.eq(sessionId);
  });

  test('a fork branches from the parent history onto its own session', { timeout: 180_000 }, async () => {
    const parent = new Host.Session();
    await EffectEx.runPromise(runText(parent, 'Remember the word pelican. Reply with exactly OK.'));

    const branch = parent.fork();
    const answer = await EffectEx.runPromise(
      runText(branch, 'What word did I ask you to remember? Reply with just that word.'),
    );
    expect(answer.toLowerCase(), 'the fork did not inherit the parent history').to.contain('pelican');
    expect(branch.sessionId, 'a fork must land on its own session').not.to.eq(parent.sessionId);
  });
});

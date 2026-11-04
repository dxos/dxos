//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { snapshot } from '../testing/fixtures.ts';
import { applyUpdate, applyVote, emptySessionState, nextVote } from './session-state.ts';
import { PICKS_ROLE, RUN_ROLE, decodeRuns, encodeRuns, toMessages } from './trajectory.ts';

describe('session state', () => {
  test('events are kept once each, in seq order, after the snapshot', ({ expect }) => {
    let state = applyUpdate(emptySessionState(), { type: 'snapshot', snapshot: snapshot('running') });
    expect(state.events.map((event) => event.seq)).toEqual([1, 4, 6, 7]);
    state = applyUpdate(state, {
      type: 'events',
      events: [
        { seq: 9, t: '', kind: 'extract', data: {} },
        { seq: 7, t: '', kind: 'act', data: {} },
        { seq: 1, t: '', kind: 'input', data: {} },
      ],
    });
    expect(state.events.map((event) => event.seq)).toEqual([1, 4, 6, 7, 9]);
    expect(state.lastSeq).toBe(9);
  });

  test('a vote applies ahead of the stream; the same thumb again clears it', ({ expect }) => {
    const state = applyVote(emptySessionState(), 'urn:a', 'up');
    expect(state.rating.feedback).toEqual({ 'urn:a': 'up' });
    expect(nextVote('up', 'up')).toBe('clear');
    expect(nextVote('up', 'down')).toBe('down');
    expect(applyVote(state, 'urn:a', 'clear').rating.feedback).toEqual({});
  });
});

describe('toMessages', () => {
  test('a reported trajectory: the prompt, then one assistant turn with calls, results, pills and picks', ({
    expect,
  }) => {
    const { session, events, results } = snapshot('reported');
    const messages = toMessages(session, events, results);
    expect(messages.map((message) => message.sender.role)).toEqual(['user', 'assistant']);
    const blocks = messages[1]?.blocks ?? [];
    // Consecutive run rows travel as one surface (base64 JSON of the list), then the picks.
    expect(blocks.map((block) => (block._tag === 'surface' ? block.role : block._tag))).toEqual([RUN_ROLE, PICKS_ROLE]);
    const payload = blocks[0]?._tag === 'surface' ? blocks[0].data?.b64 : undefined;
    const rows = typeof payload === 'string' ? decodeRuns(payload) : undefined;
    expect(rows).toMatchObject([
      {
        narration: 'Searching Google Maps for board game cafés.',
        total: 2,
        calls: [{ tool: 'search', args: 'engine=google-maps params={"q":"board game cafe Bangkok"}', ok: true }],
      },
      { narration: 'Opening the cafés with the most games.', total: 3 },
    ]);
    // Re-deriving gives the same ids, so the thread updates rows in place.
    expect(toMessages(session, events, results).map((message) => message.id)).toEqual(
      messages.map((message) => message.id),
    );
  });

  test("a vote's feedback prompt reads as one line naming the results", ({ expect }) => {
    const { session, results } = snapshot('reported');
    const prompt = [
      'Feedback on the results panel (rebuild the rating model):',
      '',
      'Liked:',
      `- ${JSON.stringify({ id: 'urn:a', types: [], props: { 'schema:name': ['Meeple Bangkok'] } })}`,
      'Disliked:',
      `- ${JSON.stringify({ id: 'urn:b', types: [], props: { 'schema:name': ['Brick & Board'] } })}`,
    ].join('\n');
    const [message] = toMessages(
      session,
      [{ seq: 1, t: '', kind: 'input', data: { text: prompt, from: 'composer' } }],
      results,
    );
    expect(message?.blocks).toEqual([
      { _tag: 'text', text: 'Votes: 👍 Meeple Bangkok · 👎 Brick ＆ Board — rebuild the ranking.' },
    ]);
  });

  test('a running session ends with a working status; a failed one with Retry', ({ expect }) => {
    const running = snapshot('running');
    expect(toMessages(running.session, running.events, running.results).at(-1)?.blocks).toEqual([
      { _tag: 'status', statusText: 'Working…' },
    ]);
    const failed = { ...snapshot('reported').session, status: 'failed' as const, busy: false, reason: 'model_error' };
    expect(toMessages(failed, [], []).at(-1)?.blocks.at(-1)).toEqual({ _tag: 'suggestion', text: 'Retry' });
  });
});

describe('run payload', () => {
  test('base64 JSON round-trips non-ASCII text and long outputs', ({ expect }) => {
    const rows = [
      {
        narration: 'ร้านบอร์ดเกม — "big" library',
        calls: [{ tool: 'search', args: 'q="บอร์ดเกม"', ok: true, output: 'x'.repeat(70_000) }],
        pills: [],
        total: 0,
        followed: 0,
      },
    ];
    expect(decodeRuns(encodeRuns(rows))).toEqual(rows);
  });
});

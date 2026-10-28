//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { snapshot } from '../testing/fixtures.ts';
import { applyUpdate, applyVote, emptySessionState, nextVote } from './session-state.ts';
import { toMessages } from './trajectory.ts';

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
    const tags = messages[1]?.blocks.map((block) => block._tag);
    expect(tags).toEqual([
      'status',
      'toolCall',
      'toolResult',
      'surface',
      'status',
      'toolCall',
      'toolResult',
      'surface',
      'surface',
    ]);
    // Re-deriving gives the same ids, so the thread updates rows in place.
    expect(toMessages(session, events, results).map((message) => message.id)).toEqual(
      messages.map((message) => message.id),
    );
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

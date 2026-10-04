//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import * as Events from './Events.ts';
import * as Fold from './Fold.ts';

const entries = (events: readonly Events.Event[]): Events.Entry[] =>
  events.map((event, index) => ({ projectId: 'project', seq: index + 1, event }));

describe('Fold', () => {
  test('deltas assemble into the message they stream, and its settled text replaces them', ({ expect }) => {
    const turnId = 'turn';
    const events = [
      new Events.UserMessage({ text: 'Which package?', turnId }),
      new Events.AssistantDelta({ messageId: 'm1', delta: 'It is ', turnId }),
      new Events.AssistantDelta({ messageId: 'm1', delta: 'in **edge**', turnId }),
    ];

    const partial = Fold.fold(entries(events));
    expect(partial.running).toBe(true);
    expect(partial.items.at(-1)).toEqual({ kind: 'assistant', id: 'm1', text: 'It is in **edge**', streaming: true });
    // A partial message is the thread's alone; the prompt replays only settled prose.
    expect(partial.turns).toEqual([{ role: 'user', text: 'Which package?' }]);

    const settled = Fold.fold(
      entries([
        ...events,
        new Events.AssistantMessage({ messageId: 'm1', text: 'It is in **edge**.', turnId }),
        new Events.TurnEnded({ steps: 1, turnId }),
      ]),
    );
    expect(settled.running).toBe(false);
    expect(settled.items).toEqual([
      { kind: 'user', id: 'seq:1', text: 'Which package?' },
      { kind: 'assistant', id: 'm1', text: 'It is in **edge**.', streaming: false },
    ]);
    expect(settled.turns.at(-1)).toEqual({ role: 'assistant', text: 'It is in **edge**.' });
  });

  test('tool runs sit between the prose they interleave with, in turn order', ({ expect }) => {
    const turnId = 'turn';
    const state = Fold.fold(
      entries([
        new Events.UserMessage({ text: 'How many?', turnId }),
        new Events.AssistantDelta({ messageId: 'm1', delta: 'Let me query.', turnId }),
        new Events.AssistantMessage({ messageId: 'm1', text: 'Let me query.', turnId }),
        new Events.ToolCall({ callId: 'c1', code: 'return 1;', turnId }),
        new Events.ToolResult({ callId: 'c1', ok: true, output: '1' }),
        new Events.ToolCall({ callId: 'c2', code: 'throw 1;', turnId }),
        new Events.ToolResult({ callId: 'c2', ok: false, output: 'Error: 1' }),
        new Events.AssistantDelta({ messageId: 'm2', delta: 'Forty', turnId }),
        new Events.AssistantDelta({ messageId: 'm2', delta: '-two.', turnId }),
      ]),
    );

    expect(state.items.map((item) => [item.kind, item.id])).toEqual([
      ['user', 'seq:1'],
      ['assistant', 'm1'],
      ['tool', 'c1'],
      ['tool', 'c2'],
      ['assistant', 'm2'],
    ]);
    expect(state.items[2]).toEqual({ kind: 'tool', id: 'c1', code: 'return 1;', output: '1', ok: true });
    expect(state.items[3]).toMatchObject({ ok: false, output: 'Error: 1' });
    expect(state.items[4]).toMatchObject({ text: 'Forty-two.', streaming: true });
  });

  test('a turn that closes mid-message leaves the partial text, no longer streaming', ({ expect }) => {
    const state = Fold.fold(
      entries([
        new Events.UserMessage({ text: 'q', turnId: 'turn' }),
        new Events.AssistantDelta({ messageId: 'm1', delta: 'Half an ans', turnId: 'turn' }),
        new Events.TurnFailed({ message: 'Interrupted before the turn finished.', turnId: 'turn' }),
      ]),
    );

    expect(state.running).toBe(false);
    expect(state.items.slice(1)).toEqual([
      { kind: 'assistant', id: 'm1', text: 'Half an ans', streaming: false },
      { kind: 'notice', id: 'seq:3', text: '⚠ Interrupted before the turn finished.' },
    ]);
  });

  test('a settled message with no text removes what its deltas opened', ({ expect }) => {
    const state = Fold.fold(
      entries([
        new Events.UserMessage({ text: 'q' }),
        new Events.AssistantDelta({ messageId: 'm1', delta: '  ' }),
        new Events.AssistantMessage({ messageId: 'm1', text: '' }),
      ]),
    );

    expect(state.items.map((item) => item.kind)).toEqual(['user']);
    expect(state.turns).toHaveLength(1);
  });

  test('a log written before streaming existed still folds', ({ expect }) => {
    // Decoded from the stored JSON, as `Log.read` does: no ids on messages or calls, no deltas.
    const decode = Schema.decodeUnknownSync(Events.Event);
    const stored = [
      { _tag: 'UserMessage', text: 'draw it' },
      { _tag: 'ToolCall', callId: 'c1', code: 'await display.text("x")' },
      { _tag: 'ToolResult', callId: 'c1', ok: true, output: 'done' },
      { _tag: 'AssistantMessage', text: 'there it is' },
      { _tag: 'AssistantMessage', text: 'and again' },
      { _tag: 'TurnEnded', steps: 2 },
    ].map((json) => decode(json));

    const state = Fold.fold(entries(stored));
    expect(state.running).toBe(false);
    expect(state.items).toEqual([
      { kind: 'user', id: 'seq:1', text: 'draw it' },
      { kind: 'tool', id: 'c1', code: 'await display.text("x")', output: 'done', ok: true },
      { kind: 'assistant', id: 'seq:4', text: 'there it is', streaming: false },
      { kind: 'assistant', id: 'seq:5', text: 'and again', streaming: false },
    ]);
    expect(state.turns.map((turn) => turn.role)).toEqual(['user', 'assistant', 'assistant']);
  });
});

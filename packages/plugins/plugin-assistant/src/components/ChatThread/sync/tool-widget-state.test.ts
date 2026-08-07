//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { createMessage } from '#testing';

import { rehydrateToolWidgetsFromMessages } from './tool-widget-state';

describe('rehydrateToolWidgetsFromMessages', () => {
  test('replays toolCall then toolResult in order', () => {
    const calls: Array<{ id: string; kind: 'object' | 'function' }> = [];
    const sink = {
      updateWidget: (id: string, value: unknown) => {
        calls.push({ id, kind: typeof value === 'function' ? 'function' : 'object' });
      },
    };

    const messages = [
      createMessage('assistant', [
        { _tag: 'toolCall', toolCallId: 't1', name: 'foo', input: '{}', providerExecuted: false },
        { _tag: 'toolResult', toolCallId: 't1', name: 'foo', result: '{}', providerExecuted: false },
      ]),
    ];

    rehydrateToolWidgetsFromMessages(sink, messages);

    expect(calls).toEqual([
      { id: 't1', kind: 'object' },
      { id: 't1', kind: 'function' },
    ]);
  });
});

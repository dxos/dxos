//
// Copyright 2026 DXOS.org
//

import * as Prompt from 'effect/unstable/ai/Prompt';
import { describe, test } from 'vitest';

import { countTurnsSincePrompt } from './scripted-assistant.ts';

const TOOL = 'space-query-objects';

const user = (text: string) => ({ role: 'user' as const, content: [{ type: 'text' as const, text }] });
const call = (id: string, name = TOOL) => ({
  role: 'assistant' as const,
  content: [{ type: 'tool-call' as const, id, name, params: {}, providerExecuted: false }],
});
const result = (id: string, name = TOOL) => ({
  role: 'tool' as const,
  content: [{ type: 'tool-result' as const, id, name, isFailure: false, result: {} }],
});
const answer = (text: string) => ({ role: 'assistant' as const, content: [{ type: 'text' as const, text }] });

describe('countTurnsSincePrompt', () => {
  test('counts the tool calls since the latest prompt only', ({ expect }) => {
    const prompt = Prompt.make([
      user('first'),
      call('a'),
      result('a'),
      answer('done'),
      user('second'),
      call('b'),
      result('b'),
      call('c'),
      result('c'),
    ]);
    expect(countTurnsSincePrompt(prompt, TOOL)).toBe(2);
  });

  test('ignores calls to other tools', ({ expect }) => {
    const prompt = Prompt.make([
      user('go'),
      call('a', 'other-tool'),
      result('a', 'other-tool'),
      call('b'),
      result('b'),
    ]);
    expect(countTurnsSincePrompt(prompt, TOOL)).toBe(1);
  });

  test('does not restart on a user message injected after a tool result', ({ expect }) => {
    const prompt = Prompt.make([user('go'), call('a'), result('a'), user('reminder'), call('b'), result('b')]);
    expect(countTurnsSincePrompt(prompt, TOOL)).toBe(2);
  });
});

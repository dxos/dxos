//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { type Message, type Thread } from '@dxos/types';

import { shouldTriggerAgent } from './should-trigger-agent';

// `shouldTriggerAgent` is a pure predicate over the schema shapes — these tests
// build plain object literals shaped like Message/Thread to avoid the ECHO proxy's
// `Obj.update`-only mutation guard.
const makeMessage = (role: 'user' | 'assistant' | undefined, text: string): Message.Message =>
  ({
    created: new Date().toISOString(),
    sender: role ? { role } : {},
    blocks: [{ _tag: 'text', text }],
  }) as unknown as Message.Message;

const makeThread = (overrides: Partial<Thread.Thread> = {}): Thread.Thread =>
  ({
    status: 'active',
    messages: [],
    ...overrides,
  }) as unknown as Thread.Thread;

describe('shouldTriggerAgent', () => {
  test('returns false when agent is undefined', ({ expect }) => {
    expect(shouldTriggerAgent(makeThread(), makeMessage('user', 'hi'), 'echo')).toBe(false);
  });

  test('returns false when agent is disabled', ({ expect }) => {
    const thread = makeThread({ agent: { enabled: false, mode: 'auto' } });
    expect(shouldTriggerAgent(thread, makeMessage('user', 'hi'), 'echo')).toBe(false);
  });

  test('returns false on assistant-authored messages (self-loop guard)', ({ expect }) => {
    const thread = makeThread({ agent: { enabled: true, mode: 'auto' } });
    expect(shouldTriggerAgent(thread, makeMessage('assistant', 'hi'), 'echo')).toBe(false);
  });

  test('treats messages with no role as user messages', ({ expect }) => {
    const thread = makeThread({ agent: { enabled: true, mode: 'auto' } });
    expect(shouldTriggerAgent(thread, makeMessage(undefined, 'hi'), 'echo')).toBe(true);
  });

  test('returns false on resolved threads even when enabled', ({ expect }) => {
    const thread = makeThread({ status: 'resolved', agent: { enabled: true, mode: 'auto' } });
    expect(shouldTriggerAgent(thread, makeMessage('user', 'hi'), 'echo')).toBe(false);
  });

  test('auto mode fires on any user message', ({ expect }) => {
    const thread = makeThread({ agent: { enabled: true, mode: 'auto' } });
    expect(shouldTriggerAgent(thread, makeMessage('user', 'anything goes'), 'echo')).toBe(true);
  });

  test('mention mode does not fire without @name', ({ expect }) => {
    const thread = makeThread({ agent: { enabled: true, mode: 'mention' } });
    expect(shouldTriggerAgent(thread, makeMessage('user', 'hello world'), 'echo')).toBe(false);
  });

  test('mention mode fires on @name match (case-insensitive)', ({ expect }) => {
    const thread = makeThread({ agent: { enabled: true, mode: 'mention' } });
    expect(shouldTriggerAgent(thread, makeMessage('user', 'hey @Echo check this'), 'echo')).toBe(true);
  });

  test('mention mode requires the @ sigil, not just the name', ({ expect }) => {
    const thread = makeThread({ agent: { enabled: true, mode: 'mention' } });
    expect(shouldTriggerAgent(thread, makeMessage('user', 'echo location'), 'echo')).toBe(false);
  });
});

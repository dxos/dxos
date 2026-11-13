//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Obj } from '@dxos/echo';
import { Message } from '@dxos/types';

import { PENDING_TEXT, hideSupersededPending } from './pending.ts';

const message = (role: 'user' | 'assistant', text: string) =>
  Obj.make(Message.Message, {
    created: new Date().toISOString(),
    sender: { role },
    blocks: [{ _tag: 'text', text }],
  });

const texts = (messages: Message.Message[]) =>
  messages.map((item) => item.blocks.flatMap((block) => (block._tag === 'text' ? [block.text] : [])).join());

describe('hideSupersededPending', () => {
  test('keeps the pending message while the turn runs', ({ expect }) => {
    const messages = [message('user', '@kai hi'), message('assistant', PENDING_TEXT)];
    expect(texts(hideSupersededPending(messages))).toEqual(['@kai hi', PENDING_TEXT]);
  });

  test('hides it once a reply follows, so the reply takes its place', ({ expect }) => {
    const messages = [message('user', '@kai hi'), message('assistant', PENDING_TEXT), message('assistant', 'ok')];
    expect(texts(hideSupersededPending(messages))).toEqual(['@kai hi', 'ok']);
  });

  test('a user message after it does not count as a reply', ({ expect }) => {
    const messages = [message('assistant', PENDING_TEXT), message('user', 'still there?')];
    expect(texts(hideSupersededPending(messages))).toEqual([PENDING_TEXT, 'still there?']);
  });
});

//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { classify } from './channel-scan.ts';

const human = (author: string) => ({ timestamp: '2026-10-01T00:00:00Z', author: { id: author } });
const bot = { timestamp: '2026-10-02T00:00:00Z', author: { id: 'gh', bot: true }, webhook_id: 'w1' };
const channel = { id: 'c1', name: 'general', type: 0 };

describe('classify', () => {
  test('a channel several people talk in is human discussion', ({ expect }) => {
    const sample = classify(channel, [human('a'), human('b'), human('c'), bot]);
    expect(sample.kind).toBe('human');
    expect(sample.humans).toBe(3);
    expect(sample.lastMessageAt).toBe('2026-10-02T00:00:00Z');
  });

  test('a channel mostly posted by bots or webhooks is a bot feed', ({ expect }) => {
    expect(classify(channel, [bot, bot, bot, human('a')]).kind).toBe('bot');
  });

  test('a channel only one or two people post in is a broadcast', ({ expect }) => {
    expect(classify(channel, [human('a'), human('a'), human('b')]).kind).toBe('broadcast');
  });

  test('a forum is kept and an empty channel is not', ({ expect }) => {
    expect(classify({ ...channel, type: 15 }, []).kind).toBe('forum');
    expect(classify(channel, []).kind).toBe('empty');
  });
});

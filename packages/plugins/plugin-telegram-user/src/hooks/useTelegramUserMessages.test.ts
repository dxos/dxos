//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { extractChatInfo, normalizeMessage } from './useTelegramUserMessages';

describe('extractChatInfo', () => {
  test('handles a regular User entity', ({ expect }) => {
    const info = extractChatInfo({
      className: 'User',
      id: 12345n,
      firstName: 'Alice',
      lastName: 'Example',
      username: 'alice',
    });
    expect(info).toEqual({ id: '12345', title: 'Alice Example', type: 'user', unread: 0 });
  });

  test('falls back to username when names are missing', ({ expect }) => {
    const info = extractChatInfo({ className: 'User', id: 7n, firstName: undefined, lastName: undefined, username: 'lone' });
    expect(info?.title).toBe('lone');
  });

  test('falls back to "User {id}" when nothing else is available', ({ expect }) => {
    const info = extractChatInfo({ className: 'User', id: 9n, firstName: undefined, lastName: undefined, username: undefined });
    expect(info?.title).toBe('User 9');
  });

  test('handles a Chat (group) entity', ({ expect }) => {
    const info = extractChatInfo({ className: 'Chat', id: 100n, title: 'Team' });
    expect(info).toEqual({ id: '100', title: 'Team', type: 'chat', unread: 0 });
  });

  test('handles a Channel entity', ({ expect }) => {
    const info = extractChatInfo({ className: 'Channel', id: 200n, title: 'Announce' });
    expect(info).toEqual({ id: '200', title: 'Announce', type: 'channel', unread: 0 });
  });

  test('returns undefined for unknown entity types', ({ expect }) => {
    expect(extractChatInfo({ className: 'ChatForbidden', id: 1n })).toBeUndefined();
    expect(extractChatInfo(undefined)).toBeUndefined();
    expect(extractChatInfo(null)).toBeUndefined();
  });

  test('returns undefined when the id is missing', ({ expect }) => {
    expect(extractChatInfo({ className: 'User', id: undefined })).toBeUndefined();
  });
});

describe('normalizeMessage', () => {
  const chat = { id: '42', title: 'Bob', type: 'user' as const, unread: 0 };

  test('returns undefined for messages with no text (media-only, service, etc.)', ({ expect }) => {
    expect(normalizeMessage({ id: 1, message: '', date: 100 }, chat)).toBeUndefined();
    expect(normalizeMessage({ id: 1, message: undefined, date: 100 }, chat)).toBeUndefined();
    expect(normalizeMessage({ id: 1, date: 100 }, chat)).toBeUndefined();
  });

  test('populates a minimal message from chat info + msg.message', ({ expect }) => {
    const out = normalizeMessage({ id: 99, message: 'hi', date: 1735_000_000, out: false }, chat);
    expect(out).toMatchObject({
      id: '42:99',
      chatId: '42',
      chatTitle: 'Bob',
      chatType: 'user',
      text: 'hi',
      date: 1735_000_000,
      outgoing: false,
    });
  });

  test('derives chatId from a DM (PeerUser) when the chat arg is missing', ({ expect }) => {
    const out = normalizeMessage(
      { id: 1, message: 'hi', date: 1, peerId: { className: 'PeerUser', userId: 55n } },
      undefined,
    );
    expect(out?.chatId).toBe('55');
  });

  test('derives chatId from a GROUP (PeerChat) when the chat arg is missing', ({ expect }) => {
    // If extractChatInfo didn't resolve the entity (e.g. access hash miss),
    // we still need to bucket the message into the right chat. Previously we
    // only looked at peerId.userId, so group messages fell off.
    const out = normalizeMessage(
      { id: 1, message: 'hi', date: 1, peerId: { className: 'PeerChat', chatId: 777n } },
      undefined,
    );
    expect(out?.chatId).toBe('777');
  });

  test('derives chatId from a CHANNEL (PeerChannel) when the chat arg is missing', ({ expect }) => {
    const out = normalizeMessage(
      { id: 1, message: 'hi', date: 1, peerId: { className: 'PeerChannel', channelId: 888n } },
      undefined,
    );
    expect(out?.chatId).toBe('888');
  });

  test('populates fromName from sender.firstName + lastName', ({ expect }) => {
    const out = normalizeMessage(
      { id: 1, message: 'hi', date: 1, sender: { firstName: 'Jane', lastName: 'Doe' } },
      chat,
    );
    expect(out?.fromName).toBe('Jane Doe');
  });

  test('skips undefined surname gracefully', ({ expect }) => {
    const out = normalizeMessage({ id: 1, message: 'hi', date: 1, sender: { firstName: 'Jane' } }, chat);
    expect(out?.fromName).toBe('Jane');
  });

  test('stringifies BigInt senderId without the "n" suffix', ({ expect }) => {
    const out = normalizeMessage({ id: 1, message: 'hi', date: 1, senderId: 1234567890n }, chat);
    expect(out?.fromId).toBe('1234567890');
  });

  test('flags outgoing messages', ({ expect }) => {
    const out = normalizeMessage({ id: 1, message: 'hi', date: 1, out: true }, chat);
    expect(out?.outgoing).toBe(true);
  });

  test('falls back to now() when date is missing', ({ expect }) => {
    const before = Math.floor(Date.now() / 1000);
    const out = normalizeMessage({ id: 1, message: 'hi' }, chat);
    const after = Math.floor(Date.now() / 1000);
    expect(out?.date).toBeGreaterThanOrEqual(before);
    expect(out?.date).toBeLessThanOrEqual(after);
  });

  test('returns undefined when no chatId can be resolved at all', ({ expect }) => {
    expect(normalizeMessage({ id: 1, message: 'hi', date: 1 }, undefined)).toBeUndefined();
  });
});

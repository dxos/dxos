//
// Copyright 2026 DXOS.org
//

import { describe, expect, test, vi } from 'vitest';

import { buildTileMenuItems } from './tile-menu';

/**
 * The regression this guards: the conversation tile built its own menu and never offered Archive.
 * A threaded mailbox renders nothing BUT conversation tiles, so the entry was unreachable in the
 * running app while the single-message tile's copy looked correct in review.
 */
describe('buildTileMenuItems', () => {
  const base = { messageId: 'm1', senderEmail: 'a@b.com', inInbox: true, onAction: vi.fn() };

  test('returns undefined without a handler', () => {
    expect(buildTileMenuItems({ ...base, onAction: undefined, enableArchive: true })).toBeUndefined();
  });

  test('returns undefined when every entry is disabled', () => {
    expect(buildTileMenuItems(base)).toBeUndefined();
  });

  test('archive leads the menu', () => {
    expect(labels({ ...base, enableArchive: true, enableIgnoreSender: true, enableCreateTopic: true })).toEqual([
      'Archive',
      'Ignore sender',
      'Create Project',
    ]);
  });

  test('archive inverts for a message that is not in the inbox', () => {
    const [entry] = buildTileMenuItems({ ...base, inInbox: false, enableArchive: true })!;
    expect(entry.label).toBe('Move to Inbox');
    expect(entry.icon).toBe('ph--tray--regular');
  });

  test('ignore sender needs an address', () => {
    expect(labels({ ...base, senderEmail: undefined, enableIgnoreSender: true, enableCreateTopic: true })).toEqual([
      'Create Project',
    ]);
  });

  test('each entry dispatches for the given message', () => {
    const onAction = vi.fn();
    const items = buildTileMenuItems({
      ...base,
      onAction,
      enableArchive: true,
      enableIgnoreSender: true,
      enableCreateTopic: true,
    })!;
    items.forEach(({ onClick }) => onClick());
    expect(onAction.mock.calls.map(([action]) => action)).toEqual([
      { type: 'archive', messageId: 'm1' },
      { type: 'ignore-sender', messageId: 'm1' },
      { type: 'create-topic', messageId: 'm1' },
    ]);
  });
});

const labels = (options: Parameters<typeof buildTileMenuItems>[0]) =>
  buildTileMenuItems(options)?.map(({ label }) => label);

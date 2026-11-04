//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/reactivity/Atom';
import * as AtomRegistry from 'effect/reactivity/AtomRegistry';
import { describe, test } from 'vitest';

import { makeChatReads } from './chat-reads.ts';

const CHAT = 'echo://space/chat';

const setup = () => {
  const registry = AtomRegistry.make();
  const targets = Atom.make<readonly string[]>([]);
  const busy = Atom.make<ReadonlySet<string>>((get) => new Set(get(targets)));
  const { reads, dispose } = makeChatReads(registry, busy);
  const unread = () => registry.get(reads.unread);
  const run = () => registry.set(targets, [CHAT]);
  const finish = () => registry.set(targets, []);
  return { reads, dispose, unread, run, finish };
};

describe('makeChatReads', () => {
  test('a turn that finishes with no view open leaves the chat unread', ({ expect }) => {
    const { dispose, unread, run, finish } = setup();
    run();
    expect(unread().has(CHAT)).toBe(false);
    finish();
    expect(unread().has(CHAT)).toBe(true);
    dispose();
  });

  test('a turn that finishes while a view is open stays read', ({ expect }) => {
    const { reads, dispose, unread, run, finish } = setup();
    const close = reads.open(CHAT);
    run();
    finish();
    expect(unread().has(CHAT)).toBe(false);
    close();
    dispose();
  });

  test('opening a view reads the chat, and closing it lets the next turn mark it again', ({ expect }) => {
    const { reads, dispose, unread, run, finish } = setup();
    run();
    finish();
    const close = reads.open(CHAT);
    expect(unread().has(CHAT)).toBe(false);
    close();
    run();
    finish();
    expect(unread().has(CHAT)).toBe(true);
    dispose();
  });
});

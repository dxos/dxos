//
// Copyright 2026 DXOS.org
//

import { describe, expect, test, vi } from 'vitest';

import { makePushSenders } from './push-senders.ts';

/** A `put` whose uploads finish only when the test says so. */
const makePut = ({ fail = false } = {}) => {
  const finish: (() => void)[] = [];
  const put = vi.fn(
    (_senders: readonly string[]) =>
      new Promise<void>((resolve, reject) => {
        finish.push(() => (fail ? reject(new Error('offline')) : resolve()));
      }),
  );
  /** Finishes the oldest pending upload and lets its continuation run. */
  const settle = async () => {
    finish.shift()?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
  };
  return { put, settle };
};

describe('push senders', () => {
  test('uploads the sorted, de-duplicated list and skips an unchanged one', async () => {
    let current = ['did:halo:Bc', 'did:halo:Ba', 'did:halo:Bc'];
    const { put, settle } = makePut();
    const senders = makePushSenders({ senders: () => current, put });

    senders.sync();
    await settle();
    expect(put).toHaveBeenCalledWith(['did:halo:Ba', 'did:halo:Bc']);

    senders.sync();
    expect(put).toHaveBeenCalledTimes(1);

    current = ['did:halo:Ba'];
    senders.sync();
    await settle();
    expect(put).toHaveBeenLastCalledWith(['did:halo:Ba']);
  });

  test('changes during an upload are folded into one upload after it', async () => {
    let current = ['did:halo:Ba'];
    const { put, settle } = makePut();
    const senders = makePushSenders({ senders: () => current, put });

    senders.sync();
    current = ['did:halo:Ba', 'did:halo:Bb'];
    senders.sync();
    current = ['did:halo:Ba', 'did:halo:Bb', 'did:halo:Bc'];
    senders.sync();
    expect(put).toHaveBeenCalledTimes(1);

    await settle();
    await settle();
    expect(put).toHaveBeenCalledTimes(2);
    expect(put).toHaveBeenLastCalledWith(['did:halo:Ba', 'did:halo:Bb', 'did:halo:Bc']);
  });

  test('a failed upload is tried again on the next sync', async () => {
    const { put, settle } = makePut({ fail: true });
    const senders = makePushSenders({ senders: () => ['did:halo:Ba'], put });

    senders.sync();
    await settle();
    senders.sync();
    expect(put).toHaveBeenCalledTimes(2);
  });
});

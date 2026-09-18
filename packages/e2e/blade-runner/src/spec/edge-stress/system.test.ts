//
// Copyright 2026 DXOS.org
//

import { afterEach, describe, expect, test, vi } from 'vitest';

import { peerCall } from './system.ts';

describe('peerCall', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test('passes a call that returns through', async () => {
    await expect(peerCall(2, 'createSpace', Promise.resolve('space-id'))).resolves.toBe('space-id');
  });

  // The regression: a peer alive but stuck inside a command used to hang the orchestrator until the
  // CI job timeout cancelled the job, which discards the artifacts that would explain it.
  test('fails a call that never returns, naming the call and the peer', async () => {
    vi.useFakeTimers();
    const rejected = expect(peerCall(3, 'editDocumentText', new Promise<never>(() => {}))).rejects.toThrow(
      /editDocumentText\(client 3\)/,
    );
    await vi.advanceTimersByTimeAsync(120_000);
    await rejected;
  });
});

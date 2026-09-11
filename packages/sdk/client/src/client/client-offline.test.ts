//
// Copyright 2026 DXOS.org
//

import { describe, onTestFinished, test, vi } from 'vitest';

import { Config } from '@dxos/config';
import { Filter, Obj } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { type LogConfig, type LogEntry, LogLevel, log } from '@dxos/log';

import { Client } from './client.ts';

// An offline client must never reach isomorphic-ws either (node sockets bypass globalThis.WebSocket).
vi.mock('isomorphic-ws', () => ({
  default: class {
    constructor(url: unknown) {
      throw new Error(`unexpected WebSocket (isomorphic-ws) in offline test: ${String(url)}`);
    }
  },
}));

describe('Client with offline config (no edge endpoint)', () => {
  test('boots, database round-trips, zero network activity, zero warnings', { timeout: 30_000 }, async ({ expect }) => {
    const networkCalls = interceptNetwork();
    const problems = captureProblems();

    const client = new Client({ config: new Config() });
    // Safety net for failure paths; a second destroy after the explicit one below is a no-op.
    onTestFinished(() => client.destroy());
    await client.initialize();
    await client.halo.createIdentity();
    await client.addTypes([TestSchema.Expando]);

    const space = await client.spaces.create();
    space.db.add(Obj.make(TestSchema.Expando, { name: 'offline' }));
    await space.db.flush();
    const names = (await space.db.query(Filter.type(TestSchema.Expando)).run()).map((obj) => obj.name);
    expect(names).toContain('offline');

    await client.destroy();

    expect(networkCalls).toEqual([]);
    expect(problems).toEqual([]);
  });
});

/**
 * Replaces the global network entry points with recorders that fail the call, so any attempt
 * to touch the network surfaces both in the recorded list and as a loud runtime error.
 */
const interceptNetwork = (): string[] => {
  const calls: string[] = [];
  const failingFetch: typeof fetch = (input) => {
    calls.push(`fetch ${String(input)}`);
    return Promise.reject(new Error(`unexpected network call in offline test: ${String(input)}`));
  };
  vi.stubGlobal('fetch', failingFetch);
  if ('WebSocket' in globalThis) {
    vi.stubGlobal(
      'WebSocket',
      class {
        constructor(url: unknown) {
          calls.push(`WebSocket ${String(url)}`);
          throw new Error(`unexpected WebSocket in offline test: ${String(url)}`);
        }
      },
    );
  }
  onTestFinished(() => {
    vi.unstubAllGlobals();
  });
  return calls;
};

/**
 * Captures every WARN+ log entry emitted while the test runs; processors receive all entries
 * regardless of the configured filter.
 */
const captureProblems = (): string[] => {
  const problems: string[] = [];
  const removeProcessor = log.addProcessor((_config: LogConfig, entry: LogEntry) => {
    if (entry.level >= LogLevel.WARN) {
      problems.push(`${LogLevel[entry.level]}: ${entry.message}`);
    }
  });
  onTestFinished(removeProcessor);
  return problems;
};

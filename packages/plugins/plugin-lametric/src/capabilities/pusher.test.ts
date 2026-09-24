//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type LaMetricTransport } from '#transport';

import { Pusher } from './pusher.ts';

const makeTransport = () => {
  const sent: string[] = [];
  const transport: LaMetricTransport = {
    kind: 'cloud',
    url: 'https://example.invalid',
    push: async (payload) => {
      sent.push(JSON.stringify(payload));
    },
  };
  return { transport, sent };
};

describe('Pusher', () => {
  test('sends the first payload immediately', async ({ expect }) => {
    const { transport, sent } = makeTransport();
    const pusher = new Pusher({ transport, minIntervalMs: 5_000 });
    pusher.send({ frames: [{ text: 'a' }] });
    await Promise.resolve();
    expect(sent).toHaveLength(1);
  });

  test('suppresses an unchanged payload', async ({ expect }) => {
    const { transport, sent } = makeTransport();
    const pusher = new Pusher({ transport, minIntervalMs: 0 });
    pusher.send({ frames: [{ text: 'a' }] });
    await Promise.resolve();
    pusher.send({ frames: [{ text: 'a' }] });
    await Promise.resolve();
    expect(sent).toHaveLength(1);
  });

  test('coalesces changes inside the interval and sends the last one', async ({ expect }) => {
    const { transport, sent } = makeTransport();
    let clock = 0;
    const pending: (() => void)[] = [];
    const pusher = new Pusher({
      transport,
      minIntervalMs: 1_000,
      now: () => clock,
      schedule: (fn) => pending.push(fn),
    });

    pusher.send({ frames: [{ text: 'a' }] });
    await Promise.resolve();
    pusher.send({ frames: [{ text: 'b' }] });
    pusher.send({ frames: [{ text: 'c' }] });
    expect(sent).toHaveLength(1);

    clock = 1_000;
    pending.forEach((fn) => fn());
    await Promise.resolve();
    expect(sent).toHaveLength(2);
    expect(JSON.parse(sent[1]).frames[0].text).toBe('c');
  });

  test('reports a rejection without throwing', async ({ expect }) => {
    const statuses: unknown[] = [];
    const transport: LaMetricTransport = {
      kind: 'local',
      url: 'https://example.invalid',
      push: async () => {
        throw new Error('LaMetric push rejected: 401');
      },
    };
    const pusher = new Pusher({ transport, minIntervalMs: 0, onStatus: (status) => statuses.push(status) });
    pusher.send({ frames: [{ text: 'a' }] });
    await Promise.resolve();
    await Promise.resolve();
    expect(statuses.at(-1)).toMatchObject({ state: 'failed' });
  });

  test('reports a success with the transport kind', async ({ expect }) => {
    const { transport } = makeTransport();
    const statuses: unknown[] = [];
    const pusher = new Pusher({ transport, minIntervalMs: 0, onStatus: (status) => statuses.push(status) });
    pusher.send({ frames: [{ text: 'a' }] });
    await Promise.resolve();
    await Promise.resolve();
    expect(statuses.at(-1)).toEqual({ state: 'pushed', kind: 'cloud' });
  });
});

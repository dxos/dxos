//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';

import { GoogleMailApi } from '../services';

import { generateGmailDataset } from './gmail-fixtures';

describe('generateGmailDataset + GoogleMailApi.mock', () => {
  test('generates a coherent, ascending-by-date dataset', ({ expect }) => {
    const { labels, messages } = generateGmailDataset({ count: 30, seed: 1 });
    expect(labels.some((label) => label.id === 'INBOX')).toBe(true);
    expect(messages).toHaveLength(30);
    // Every message has the headers/body the mapper reads.
    for (const message of messages) {
      expect(message.payload.headers.find((header) => header.name === 'From')?.value).toMatch(/@/);
      expect(message.payload.headers.find((header) => header.name === 'Subject')?.value).toBeTruthy();
      expect(message.payload.body?.data).toBeTruthy();
    }
    // Ascending by internalDate (the mock's date-window filter relies on it).
    const dates = messages.map((message) => Number(message.internalDate));
    expect(dates).toEqual([...dates].sort((a, b) => a - b));
  });

  test('is deterministic for a fixed seed', ({ expect }) => {
    // Pin the window too: with the default window anchored to `new Date()`, two calls a moment apart
    // would produce different internalDates.
    const window = { start: new Date('2026-01-01T00:00:00Z'), end: new Date('2026-02-01T00:00:00Z') };
    const first = generateGmailDataset({ count: 10, seed: 7, ...window });
    const second = generateGmailDataset({ count: 10, seed: 7, ...window });
    expect(second.messages).toEqual(first.messages);
  });

  test('mock service paginates and resolves messages', async ({ expect }) => {
    const dataset = generateGmailDataset({ count: 25, seed: 3 });
    const program = Effect.gen(function* () {
      const api = yield* GoogleMailApi;

      const { labels } = yield* api.listLabels('me');
      expect(labels).toEqual(dataset.labels);

      // First page.
      const page1 = yield* api.listMessages('me', '', 10, undefined);
      expect(page1.messages).toHaveLength(10);
      expect(page1.resultSizeEstimate).toBe(25);
      expect(page1.nextPageToken).toBeDefined();

      // Walk the rest via pageToken.
      const page2 = yield* api.listMessages('me', '', 10, page1.nextPageToken);
      const page3 = yield* api.listMessages('me', '', 10, page2.nextPageToken);
      expect(page2.messages).toHaveLength(10);
      expect(page3.messages).toHaveLength(5);
      expect(page3.nextPageToken).toBeUndefined();

      // getMessage resolves full bodies.
      const full = yield* api.getMessage('me', page1.messages![0].id);
      expect(full.id).toBe(page1.messages![0].id);
      expect(full.payload.body?.data).toBeTruthy();
    });

    await EffectEx.runPromise(program.pipe(Effect.provide(GoogleMailApi.mock(dataset))));
  });

  test('mock service honours the after:/before: date window', async ({ expect }) => {
    const start = new Date('2026-01-01T00:00:00Z');
    const end = new Date('2026-01-31T00:00:00Z');
    const dataset = generateGmailDataset({ count: 30, seed: 5, start, end });

    const program = Effect.gen(function* () {
      const api = yield* GoogleMailApi;
      // A window covering only the back half of the dataset.
      const { resultSizeEstimate } = yield* api.listMessages('me', 'after:2026/01/16', 100, undefined);
      expect(resultSizeEstimate).toBeGreaterThan(0);
      expect(resultSizeEstimate).toBeLessThan(30);
    });

    await EffectEx.runPromise(program.pipe(Effect.provide(GoogleMailApi.mock(dataset))));
  });
});

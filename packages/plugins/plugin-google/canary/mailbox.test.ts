//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import { describe, test } from 'vitest';

import * as EffectEx from '@dxos/effect/EffectEx';

import { GoogleMailApi } from '#services';

import { GoogleApiError } from '../src/errors.ts';
import { generateGmailDataset } from '../src/testing/index.ts';
import { CanaryMailbox } from './mailbox.ts';

const dataset = generateGmailDataset({ count: 1_200, labels: ['enron-pool'], seed: 1 });
const unused = () => Effect.die(new Error('not used'));
const mailbox = (patch = {}) =>
  GoogleMailApi.pipe(
    Effect.provide(GoogleMailApi.mock(dataset)),
    Effect.map((api) => new CanaryMailbox(GoogleMailApi.of({ ...api, ...patch }), unused)),
  );

describe('CanaryMailbox', () => {
  test('pages a search to the end and keys headers by the names asked for', async ({ expect }) => {
    const box = await EffectEx.runPromise(mailbox());
    expect(new Set(await EffectEx.runPromise(box.listIds(''))).size).toBe(1_200);
    const { headers } = await EffectEx.runPromise(box.getHeaders(dataset.messages[0].id, ['subject', 'X-Absent']));
    expect(Object.keys(headers)).toEqual(['subject']);
  });

  test('retries Gmail quota errors and gives up on anything else', async ({ expect }) => {
    const ensure = (code: number) =>
      Effect.gen(function* () {
        let calls = 0;
        const inner = yield* GoogleMailApi.pipe(Effect.provide(GoogleMailApi.mock(dataset)));
        // Suspended, so each retry runs the call again rather than replaying the first result.
        const listLabels = (userId: string) =>
          Effect.suspend(() =>
            ++calls === 1 ? Effect.fail(new GoogleApiError(code, 'refused')) : inner.listLabels(userId),
          );
        const exit = yield* (yield* mailbox({ listLabels })).ensureLabel('enron-pool').pipe(Effect.exit);
        return { exit, calls };
      });
    const quota = await EffectEx.runPromise(ensure(429));
    expect([Exit.isSuccess(quota.exit), quota.calls]).toEqual([true, 2]);
    const forbidden = await EffectEx.runPromise(ensure(403));
    expect([Exit.isFailure(forbidden.exit), forbidden.calls]).toEqual([true, 1]);
  });
});

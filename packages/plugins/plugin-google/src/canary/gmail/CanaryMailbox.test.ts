//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import { describe, test } from 'vitest';

import * as EffectEx from '@dxos/effect/EffectEx';

import { GoogleMailApi } from '#services';

import { GoogleApiError } from '../../errors.ts';
import { generateGmailDataset } from '../../testing/index.ts';
import { CanaryMailbox } from './CanaryMailbox.ts';

const dataset = generateGmailDataset({ count: 1_200, labels: ['enron-pool'], seed: 1 });

const mockApi = () => GoogleMailApi.pipe(Effect.provide(GoogleMailApi.mock(dataset)));

describe('CanaryMailbox', () => {
  test('pages a search through to the end', async ({ expect }) => {
    const mailbox = new CanaryMailbox(await EffectEx.runPromise(mockApi()));
    const ids = await EffectEx.runPromise(mailbox.listIds(''));
    expect(ids).toHaveLength(1_200);
    expect(new Set(ids).size).toBe(1_200);
  });

  test('returns only the asked-for headers, matched without regard to case', async ({ expect }) => {
    const mailbox = new CanaryMailbox(await EffectEx.runPromise(mockApi()));
    const message = dataset.messages[0];
    const metadata = await EffectEx.runPromise(mailbox.getMetadata(message.id, ['subject', 'From']));
    expect(metadata.internalDate).toBe(Number(message.internalDate));
    expect(Object.keys(metadata.headers).sort()).toEqual(['From', 'Subject']);
  });

  test('retries Gmail quota errors and gives up on anything else', async ({ expect }) => {
    const failing = (code: number) =>
      Effect.gen(function* () {
        const inner = yield* mockApi();
        let calls = 0;
        const api = GoogleMailApi.of({
          ...inner,
          // Suspended, so each retry runs the call again rather than replaying the first result.
          listLabels: (userId) =>
            Effect.suspend(() => {
              calls += 1;
              return calls === 1 ? Effect.fail(new GoogleApiError(code, 'refused')) : inner.listLabels(userId);
            }),
        });
        const exit = yield* new CanaryMailbox(api).ensureLabel('enron-pool').pipe(Effect.exit);
        return { exit, calls };
      });

    const quota = await EffectEx.runPromise(failing(429));
    expect(Exit.isSuccess(quota.exit)).toBe(true);
    expect(quota.calls).toBe(2);

    const forbidden = await EffectEx.runPromise(failing(403));
    expect(Exit.isFailure(forbidden.exit)).toBe(true);
    expect(forbidden.calls).toBe(1);
  });
});

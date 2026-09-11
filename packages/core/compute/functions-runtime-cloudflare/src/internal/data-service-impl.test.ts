//
// Copyright 2026 DXOS.org
//

import * as Stream from 'effect/Stream';
import { describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';
import { SpaceId } from '@dxos/keys';
import { type EdgeFunctionEnv } from '@dxos/protocols';

import { DataServiceImpl } from './data-service-impl.ts';

describe('DataServiceImpl', () => {
  test('subscribe emits the ready beacon first', async ({ expect }) => {
    // The beacon path never touches the underlying binding, so an empty stub suffices.
    const impl = new DataServiceImpl({} as EdgeFunctionEnv.TraceContext, {} as EdgeFunctionEnv.DataService);

    const first = await EffectEx.runPromise(
      Stream.runHead(impl['DataService.subscribe']({ subscriptionId: 'test-subscription', spaceId: SpaceId.random() })),
    );

    // `RepoProxy` gates `updateSubscription` on this first batch; without it document loads hang.
    expect(first._tag).toBe('Some');
    expect(first._tag === 'Some' && first.value).toEqual({ updates: [] });
  });
});

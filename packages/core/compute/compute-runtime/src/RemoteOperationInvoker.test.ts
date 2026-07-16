//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Effect from 'effect/Effect';

import { EffectEx } from '@dxos/effect';
import { Context as DxosContext } from '@dxos/context';

import * as RemoteOperationInvoker from './RemoteOperationInvoker';

describe('RemoteOperationInvoker', () => {
  test('resolves the Service tag from a provided layer', async ({ expect }) => {
    const stub: RemoteOperationInvoker.Invoker = {
      invoke: <I, O>(_ctx: DxosContext, _deployedId: string, input: I) => Effect.succeed(input as unknown as O),
    };
    const program = Effect.gen(function* () {
      const invoker = yield* RemoteOperationInvoker.Service;
      return yield* invoker.invoke(DxosContext.default(), 'fn-1', { value: 42 });
    });
    const result = await EffectEx.runPromise(program.pipe(Effect.provideService(RemoteOperationInvoker.Service, stub)));
    expect(result).toEqual({ value: 42 });
  });
});

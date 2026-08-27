//
// Copyright 2026 DXOS.org
//

import * as Deferred from 'effect/Deferred';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import * as Ref from 'effect/Ref';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import * as ObservabilityMapping from '@dxos/app-toolkit/ObservabilityMapping';
import * as Operation from '@dxos/compute/Operation';
import { EffectEx } from '@dxos/effect';
import { DXN } from '@dxos/keys';
import { OperationInvoker } from '@dxos/operation';

import { type MappedEvent, listen } from './invocation-listener';

const Rename = Operation.make({
  meta: { key: DXN.make('com.example.operation.test.rename') },
  input: Schema.Struct({ name: Schema.String }),
  output: Schema.Struct({ id: Schema.String }),
});

const Untracked = Operation.make({
  meta: { key: DXN.make('com.example.operation.test.untracked') },
  input: Schema.Struct({ name: Schema.String }),
  output: Schema.Void,
});

const renameHandler = Operation.withHandler(Rename, ({ name }) => Effect.succeed({ id: `id-${name}` }));
const untrackedHandler = Operation.withHandler(Untracked, () => Effect.void);

/**
 * A `Ref`-backed waiter that resolves once a counter reaches a target, without polling. Mirrors the
 * `waitForEvents` pattern in `@dxos/operation`'s `invoker.test.ts`.
 */
const makeCounterWaiter = () =>
  Effect.gen(function* () {
    const waiterRef = yield* Ref.make<{ target: number; deferred: Deferred.Deferred<void> } | null>(null);

    const checkWaiter = (count: number) =>
      Effect.gen(function* () {
        const waiter = yield* Ref.get(waiterRef);
        if (waiter && count >= waiter.target) {
          yield* Deferred.succeed(waiter.deferred, undefined);
          yield* Ref.set(waiterRef, null);
        }
      });

    const waitFor = (count: number, current: () => number) =>
      Effect.gen(function* () {
        if (current() >= count) {
          return;
        }
        const deferred = yield* Deferred.make<void>();
        yield* Ref.set(waiterRef, { target: count, deferred });
        // Check again in case the count advanced between the check above and setting the ref.
        yield* checkWaiter(current());
        yield* Deferred.await(deferred);
      });

    return { checkWaiter, waitFor };
  }).pipe(Effect.runSync);

/** Runs the listener over an invoker and collects what it sends. */
const setup = (mappings: ObservabilityMapping.ObservabilityMapping[]) => {
  const runtime = ManagedRuntime.make(Layer.empty);
  const invoker = OperationInvoker.make(() => Effect.succeed([renameHandler, untrackedHandler]), runtime);
  const sent: MappedEvent[] = [];
  const waiter = makeCounterWaiter();
  Effect.runFork(
    listen(
      invoker,
      () => mappings,
      (event) =>
        Effect.gen(function* () {
          sent.push(event);
          yield* waiter.checkWaiter(sent.length);
        }),
    ),
  );
  const waitForSent = (count: number) => Effect.runPromise(waiter.waitFor(count, () => sent.length));
  return { invoker, sent, waitForSent };
};

describe('invocation listener', () => {
  test('sends the event an invocation is mapped to', async ({ expect }) => {
    const { invoker, sent, waitForSent } = setup([
      ObservabilityMapping.make({
        operation: Rename,
        event: 'test.rename',
        properties: (input, output) => ({ name: input.name, id: output.id }),
      }),
    ]);

    await EffectEx.runPromise(invoker.invoke(Rename, { name: 'alpha' }));
    await waitForSent(1);

    expect(sent).toEqual([{ name: 'test.rename', properties: { name: 'alpha', id: 'id-alpha' } }]);
  });

  test('an operation with no mapping sends nothing', async ({ expect }) => {
    const { invoker, sent } = setup([]);

    await EffectEx.runPromise(invoker.invoke(Untracked, { name: 'alpha' }));

    expect(sent).toEqual([]);
  });

  test('a mapping declines an invocation by deriving no properties', async ({ expect }) => {
    const { invoker, sent, waitForSent } = setup([
      ObservabilityMapping.make({
        operation: Rename,
        event: 'test.rename',
        properties: (input) => (input.name === 'alpha' ? undefined : { name: input.name }),
      }),
    ]);

    await EffectEx.runPromise(invoker.invoke(Rename, { name: 'alpha' }));
    await EffectEx.runPromise(invoker.invoke(Rename, { name: 'beta' }));
    await waitForSent(1);

    expect(sent).toEqual([{ name: 'test.rename', properties: { name: 'beta' } }]);
  });

  test('a failing send does not escape the listener', async ({ expect }) => {
    const runtime = ManagedRuntime.make(Layer.empty);
    const invoker = OperationInvoker.make(() => Effect.succeed([renameHandler]), runtime);
    let attempts = 0;
    const waiter = makeCounterWaiter();
    Effect.runFork(
      listen(
        invoker,
        () => [ObservabilityMapping.make({ operation: Rename, event: 'test.rename' })],
        () =>
          Effect.gen(function* () {
            attempts++;
            yield* waiter.checkWaiter(attempts);
            yield* Effect.fail(new Error('sink down'));
          }),
      ),
    );

    // Telemetry must not fail the action it observes: the second invocation is still reported.
    await EffectEx.runPromise(invoker.invoke(Rename, { name: 'alpha' }));
    await EffectEx.runPromise(invoker.invoke(Rename, { name: 'beta' }));
    await Effect.runPromise(waiter.waitFor(2, () => attempts));

    expect(attempts).toBe(2);
  });
});

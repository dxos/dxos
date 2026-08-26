//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
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

/** Runs the listener over an invoker and collects what it sends. */
const setup = (mappings: ObservabilityMapping.ObservabilityMapping[]) => {
  const runtime = ManagedRuntime.make(Layer.empty) as unknown as ManagedRuntime.ManagedRuntime<any, any>;
  const invoker = OperationInvoker.make(() => Effect.succeed([renameHandler, untrackedHandler]), runtime);
  const sent: MappedEvent[] = [];
  Effect.runFork(
    listen(
      invoker,
      () => mappings,
      (event) => Effect.sync(() => void sent.push(event)),
    ),
  );
  return { invoker, sent };
};

/** The listener consumes the stream asynchronously; yield until it has caught up. */
const flush = async (sent: MappedEvent[], count: number) => {
  for (let attempt = 0; attempt < 100 && sent.length < count; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
};

describe('invocation listener', () => {
  test('sends the event an invocation is mapped to', async ({ expect }) => {
    const { invoker, sent } = setup([
      ObservabilityMapping.make({
        operation: Rename,
        event: 'test.rename',
        properties: (input, output) => ({ name: input.name, id: output.id }),
      }),
    ]);

    await EffectEx.runPromise(invoker.invoke(Rename, { name: 'alpha' }));
    await flush(sent, 1);

    expect(sent).toEqual([{ name: 'test.rename', properties: { name: 'alpha', id: 'id-alpha' } }]);
  });

  test('an operation with no mapping sends nothing', async ({ expect }) => {
    const { invoker, sent } = setup([]);

    await EffectEx.runPromise(invoker.invoke(Untracked, { name: 'alpha' }));
    await flush(sent, 1);

    expect(sent).toEqual([]);
  });

  test('a mapping declines an invocation by deriving no properties', async ({ expect }) => {
    const { invoker, sent } = setup([
      ObservabilityMapping.make({
        operation: Rename,
        event: 'test.rename',
        properties: (input) => (input.name === 'alpha' ? undefined : { name: input.name }),
      }),
    ]);

    await EffectEx.runPromise(invoker.invoke(Rename, { name: 'alpha' }));
    await EffectEx.runPromise(invoker.invoke(Rename, { name: 'beta' }));
    await flush(sent, 1);

    expect(sent).toEqual([{ name: 'test.rename', properties: { name: 'beta' } }]);
  });

  test('a failing send does not escape the listener', async ({ expect }) => {
    const runtime = ManagedRuntime.make(Layer.empty) as unknown as ManagedRuntime.ManagedRuntime<any, any>;
    const invoker = OperationInvoker.make(() => Effect.succeed([renameHandler]), runtime);
    let attempts = 0;
    Effect.runFork(
      listen(
        invoker,
        () => [ObservabilityMapping.make({ operation: Rename, event: 'test.rename' })],
        () => Effect.sync(() => void attempts++).pipe(Effect.andThen(Effect.fail(new Error('sink down')))),
      ),
    );

    // Telemetry must not fail the action it observes: the second invocation is still reported.
    await EffectEx.runPromise(invoker.invoke(Rename, { name: 'alpha' }));
    await EffectEx.runPromise(invoker.invoke(Rename, { name: 'beta' }));
    for (let attempt = 0; attempt < 100 && attempts < 2; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    expect(attempts).toBe(2);
  });
});

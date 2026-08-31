//
// Copyright 2026 DXOS.org
//

import { type RenderResult, act } from '@testing-library/react';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import React, { Suspense } from 'react';
import { describe, test } from 'vitest';

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import { EffectEx } from '@dxos/effect';
import { DXN } from '@dxos/keys';

import { ActivationEvents, Capabilities } from '../../common';
import { Capability, Plugin } from '../../core';
import { ProcessManagerPlugin } from '../../plugin-process-manager';
import { createTestApp } from '../../testing/harness';
import { render } from '../../testing/react';
import { useOperationHandler } from './useCapabilities';

const testMeta = Plugin.makeMeta({
  key: DXN.make('org.dxos.plugin.test.useOperationHandler'),
  name: 'UseOperationHandlerTest',
});

const Add = Operation.make({
  meta: { key: DXN.make('com.example.operation.add'), name: 'Add' },
  input: Schema.Struct({ a: Schema.Number, b: Schema.Number }),
  output: Schema.Struct({ sum: Schema.Number }),
});

const AddHandler = Add.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ a, b }) {
      return { sum: a + b };
    }),
  ),
);

const HandlerPlugin = Plugin.define(testMeta).pipe(
  Plugin.addModule({
    id: 'operation-handler',
    activatesOn: ActivationEvents.Startup,
    provides: [Capabilities.OperationHandler],
    activate: () =>
      Effect.succeed([
        Capability.contribute(
          Capabilities.OperationHandler,
          OperationHandlerSet.lazy([Add.pipe(Operation.lazyHandler(() => Promise.resolve({ default: AddHandler })))]),
        ),
      ]),
  }),
  Plugin.make,
);

type AddFn = Operation.Definition.HandlerType<typeof Add>;

const Probe = ({ onResolve }: { onResolve: (handler: AddFn) => void }) => {
  const handler = useOperationHandler(Add);
  onResolve(handler);
  return <span data-testid='resolved' />;
};

describe('useCapabilities', () => {
  test('useOperationHandler resolves a lazy handler to a callable effect fn', async ({ expect }) => {
    await using harness = await createTestApp({ plugins: [ProcessManagerPlugin(), HandlerPlugin()] });
    let handler: AddFn | undefined;
    let view!: RenderResult;
    // Async act: RTL's sync-act render leaves an initial-mount suspension unresumable in jsdom.
    await act(async () => {
      view = render(
        harness,
        <Suspense fallback={<span data-testid='loading' />}>
          <Probe onResolve={(fn) => (handler = fn)} />
        </Suspense>,
      );
    });
    await view.findByTestId('resolved');
    const result = await EffectEx.runPromise(handler!({ a: 2, b: 3 }));
    expect(result).toEqual({ sum: 5 });
    // Unmount before the harness disposes: shutdown removes the contribution and a still-mounted
    // Probe would re-render into a boundary-less NoHandlerError.
    view.unmount();
  });
});

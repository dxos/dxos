//
// Copyright 2026 DXOS.org
//

import { type RenderResult, act } from '@testing-library/react';
import * as Effect from 'effect/Effect';
import React, { Suspense } from 'react';
import { describe, test } from 'vitest';

import { SpaceId } from '@dxos/keys';

import { ProcessManagerPlugin } from '../../plugin-process-manager';
import { createTestApp } from '../../testing/harness';
import { render } from '../../testing/react';
import { useSpaceCallback } from './useProcessManagerRuntime';

type AddFn = (a: number, b: number) => Promise<number>;

const Probe = ({ onResolve }: { onResolve: (fn: AddFn) => void }) => {
  onResolve(useSpaceCallback(SpaceId.random(), [], (a: number, b: number) => Effect.succeed(a + b)));
  return <span data-testid='resolved' />;
};

describe('useProcessManagerRuntime', () => {
  test('useSpaceCallback passes the callback arguments through to fn', async ({ expect }) => {
    await using harness = await createTestApp({ plugins: [ProcessManagerPlugin()] });
    let add: AddFn | undefined;
    let view!: RenderResult;
    // Async act: RTL's sync-act render leaves an initial-mount suspension unresumable in jsdom.
    await act(async () => {
      view = render(
        harness,
        <Suspense fallback={<span data-testid='loading' />}>
          <Probe onResolve={(fn) => (add = fn)} />
        </Suspense>,
      );
    });
    await view.findByTestId('resolved');
    expect(await add!(40, 2)).toBe(42);
    view.unmount();
  });
});

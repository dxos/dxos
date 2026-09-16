//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { DeckPlugin } from '#plugin';
import { DeckCapabilities } from '#types';

describe('LayoutOperation.UpdateDrawer', () => {
  test('toggles, sets, and clamps the persisted drawer state', async ({ expect }) => {
    await using harness = await createComposerTestApp({ plugins: [DeckPlugin()] });
    const readState = () => harness.get(Capabilities.AtomRegistry).get(harness.get(DeckCapabilities.State));

    expect(readState().drawerState).toBeUndefined();

    await harness.runPromise(Operation.invoke(LayoutOperation.UpdateDrawer, { state: 'toggle' }));
    expect(readState().drawerState).toBe('open');

    await harness.runPromise(Operation.invoke(LayoutOperation.UpdateDrawer, { height: 30 }));
    expect(readState().drawerHeight).toBe(30);
    expect(readState().drawerState).toBe('open');

    await harness.runPromise(Operation.invoke(LayoutOperation.UpdateDrawer, { state: 'closed' }));
    expect(readState().drawerState).toBe('closed');

    await harness.runPromise(Operation.invoke(LayoutOperation.UpdateDrawer, { height: 100 }));
    expect(readState().drawerHeight).toBe(64);

    await harness.runPromise(Operation.invoke(LayoutOperation.UpdateDrawer, { height: 2 }));
    expect(readState().drawerHeight).toBe(8);

    await harness.runPromise(Operation.invoke(LayoutOperation.UpdateDrawer, { state: 'toggle' }));
    expect(readState().drawerState).toBe('open');
  });
});

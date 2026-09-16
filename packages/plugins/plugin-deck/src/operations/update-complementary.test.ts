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

describe('LayoutOperation.UpdateComplementary', () => {
  test('selecting a panel expands the sidebar, and collapsing keeps the panel', async ({ expect }) => {
    await using harness = await createComposerTestApp({ plugins: [DeckPlugin()] });
    const readState = () => harness.get(Capabilities.AtomRegistry).get(harness.get(DeckCapabilities.State));

    await harness.runPromise(Operation.invoke(LayoutOperation.UpdateComplementary, { subject: 'trace' }));
    expect(readState().complementarySidebarPanel).toBe('trace');
    expect(readState().complementarySidebarState).toBe('expanded');

    await harness.runPromise(Operation.invoke(LayoutOperation.UpdateComplementary, { state: 'collapsed' }));
    expect(readState().complementarySidebarState).toBe('collapsed');
    expect(readState().complementarySidebarPanel).toBe('trace');

    await harness.runPromise(Operation.invoke(LayoutOperation.UpdateComplementary, { subject: 'logs' }));
    expect(readState().complementarySidebarPanel).toBe('logs');
    expect(readState().complementarySidebarState).toBe('expanded');
  });
});

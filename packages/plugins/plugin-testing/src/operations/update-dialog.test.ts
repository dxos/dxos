//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';

import * as StorybookPlugin from '#meta';
import { StorybookCapabilities } from '#types';

import * as Harness from '../Harness.ts';

await Harness.preload({ plugins: [StorybookPlugin.make()] });

describe('LayoutOperation.UpdateDialog', () => {
  test('a close naming a dialog leaves another that has replaced it open', async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({ plugins: [StorybookPlugin.make()] });
    const read = () => harness.get(Capabilities.AtomRegistry).get(harness.get(StorybookCapabilities.LayoutState));

    await harness.runPromise(Operation.invoke(LayoutOperation.UpdateDialog, { subject: 'dxn:test:replacing' }));
    await harness.runPromise(
      Operation.invoke(LayoutOperation.UpdateDialog, { subject: 'dxn:test:replaced', state: false }),
    );
    expect(read().dialogOpen).toBe(true);
    expect(read().dialogContent?.component).toBe('dxn:test:replacing');

    await harness.runPromise(
      Operation.invoke(LayoutOperation.UpdateDialog, { subject: 'dxn:test:replacing', state: false }),
    );
    expect(read().dialogOpen).toBe(false);
    expect(read().dialogContent).toBeNull();
  });
});

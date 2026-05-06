//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { AppActivationEvents } from '@dxos/app-toolkit';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { SpacePlugin } from './SpacePlugin';
import { meta } from './meta';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('SpacePlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    // Skip autoStart: ReactSurface, ReactRoot, and NavigationHandler import browser-only deps.
    // #capabilities resolves to capabilities/node.ts in Node tests, which only exports
    // IdentityCreated, OperationHandler, and UndoMappings. AppGraphBuilder, SpaceState,
    // SpaceSettings etc. are undefined here; firing SetupAppGraph or Startup would either
    // produce wrong IDs or crash. schema is the safest module to verify.
    await using harness = await createComposerTestApp({
      plugins: [SpacePlugin({})],
      autoStart: false,
    });

    // schema activates on SetupSchema; safe in Node (no browser deps).
    await harness.fire(AppActivationEvents.SetupSchema);
    expect(harness.manager.getActive()).toContain(moduleId('schema'));
  });
});

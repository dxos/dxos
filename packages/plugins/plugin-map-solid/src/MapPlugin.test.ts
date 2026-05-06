//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ActivationEvents, OperationPlugin, RuntimePlugin } from '@dxos/app-framework';
import { createTestApp } from '@dxos/app-framework/testing';

import { MapPlugin } from './MapPlugin';
import { meta } from './meta';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('MapPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    // Use createTestApp directly — MapPlugin has no core plugin dependencies.
    // jsdom environment (see vitest.config.ts): surface.tsx registers a Solid.js custom element.
    await using harness = await createTestApp({
      plugins: [OperationPlugin(), RuntimePlugin(), MapPlugin()],
      autoStart: false,
    });

    // surface activates on SetupReactSurface (id is 'surface' per MapPlugin.tsx).
    await harness.fire(ActivationEvents.SetupReactSurface);
    expect(harness.manager.getActive()).toContain(moduleId('surface'));
  });
});

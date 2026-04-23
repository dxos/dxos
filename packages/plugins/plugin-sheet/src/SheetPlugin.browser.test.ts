//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ActivationEvents, Capabilities, OperationPlugin, RuntimePlugin } from '@dxos/app-framework';
import { createTestApp } from '@dxos/app-framework/testing';
import { AppActivationEvents, AppCapabilities } from '@dxos/app-toolkit';
import { ClientEvents } from '@dxos/plugin-client/types';

import { SheetPlugin } from './SheetPlugin';
import { SheetCapabilities } from '#types';

describe('SheetPlugin', () => {
  test('activates and contributes expected capabilities', async ({ expect }) => {
    await using harness = await createTestApp({ plugins: [SheetPlugin()] });
    const surfaces = harness.getAll(Capabilities.ReactSurface).flat();
    expect(surfaces.length).toBeGreaterThan(0);
  });

  test('fires activation events explicitly with autoStart: false', async ({ expect }) => {
    await using harness = await createTestApp({ plugins: [SheetPlugin()], autoStart: false });

    expect(harness.getAll(AppCapabilities.Schema)).toHaveLength(0);
    expect(harness.getAll(Capabilities.ReactSurface)).toHaveLength(0);

    await harness.fire(AppActivationEvents.SetupSchema);
    const schemas = harness.getAll(AppCapabilities.Schema).flat();
    expect(schemas.length).toBeGreaterThan(0);
    expect(harness.getAll(Capabilities.ReactSurface)).toHaveLength(0);

    await harness.fire(ActivationEvents.SetupReactSurface);
    expect(harness.getAll(Capabilities.ReactSurface).flat().length).toBeGreaterThan(0);
  });

  test('waitForEvent resolves once the event has been fired', async ({ expect }) => {
    await using harness = await createTestApp({ plugins: [SheetPlugin()], autoStart: false });
    await Promise.all([
      harness.fire(AppActivationEvents.SetupTranslations),
      harness.waitForEvent(AppActivationEvents.SetupTranslations),
    ]);
    expect(harness.getAll(AppCapabilities.Translations).flat().length).toBeGreaterThan(0);
  });

  test('ComputeGraphRegistry module activates on client-ready with ProcessManagerRuntime available', async ({
    expect,
  }) => {
    await using harness = await createTestApp({
      plugins: [RuntimePlugin(), OperationPlugin(), SheetPlugin()],
      autoStart: true,
    });

    // RuntimePlugin + Startup must contribute this before client-ready; otherwise ComputeGraphRegistry
    // (activates on ClientEvents.ClientReady) throws when resolving ProcessManagerRuntime.
    expect(harness.getAll(Capabilities.ProcessManagerRuntime).length).toBeGreaterThan(0);

    await harness.fire(ClientEvents.ClientReady);

    expect(harness.getAll(SheetCapabilities.ComputeGraphRegistry).length).toBeGreaterThan(0);
  });
});

//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ActivationEvents, Capabilities } from '@dxos/app-framework';
import { createTestApp } from '@dxos/app-framework/testing';
import { AppActivationEvents, AppCapabilities } from '@dxos/app-toolkit';

import { IrohBeaconPlugin } from './IrohBeaconPlugin';

describe('IrohBeaconPlugin', () => {
  //
  // Module activation tests — one per module in IrohBeaconPlugin.ts.
  //
  describe('modules', () => {
    // The beacon-service module activates on ClientEvents.SpacesReady and requires a real Client
    // capability (creates iroh transport, starts broadcasting). Not exercised in isolation.
    test.skip('beacon-service module (requires ClientEvents.SpacesReady + Client)', () => {});

    test('surfaces module contributes on SetupReactSurface', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [IrohBeaconPlugin()], autoStart: false });
      expect(harness.getAll(Capabilities.ReactSurface)).toHaveLength(0);

      await harness.fire(ActivationEvents.SetupReactSurface);
      expect(harness.getAll(Capabilities.ReactSurface).flat().length).toBeGreaterThan(0);
    });

    test('translations module contributes resources on SetupTranslations', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [IrohBeaconPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.Translations)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupTranslations);
      expect(harness.getAll(AppCapabilities.Translations).flat().length).toBeGreaterThan(0);
    });
  });

  //
  // End-to-end plugin tests.
  //
  describe('plugin', () => {
    test('activates and contributes expected capabilities', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [IrohBeaconPlugin()] });
      expect(harness.getAll(Capabilities.ReactSurface).flat().length).toBeGreaterThan(0);
    });
  });
});

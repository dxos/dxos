//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ActivationEvents, Capabilities } from '@dxos/app-framework';
import { createTestApp } from '@dxos/app-framework/testing';
import { AppActivationEvents, AppCapabilities } from '@dxos/app-toolkit';

import { NativeFilesystemPlugin } from './NativeFilesystemPlugin';

describe('NativeFilesystemPlugin', () => {
  //
  // Module activation tests — one per module in NativeFilesystemPlugin.tsx.
  //
  describe('modules', () => {
    test('translations module contributes resources on SetupTranslations', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [NativeFilesystemPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.Translations)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupTranslations);
      expect(harness.getAll(AppCapabilities.Translations).flat().length).toBeGreaterThan(0);
    });

    test('operation-handler module contributes on SetupOperationHandler', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [NativeFilesystemPlugin()], autoStart: false });
      expect(harness.getAll(Capabilities.OperationHandler)).toHaveLength(0);

      await harness.fire(ActivationEvents.SetupOperationHandler);
      expect(harness.getAll(Capabilities.OperationHandler).length).toBeGreaterThan(0);
    });

    // The app-graph, surface, and markdown-extension modules all activate on composite
    // `allOf(<public event>, StateReady)` conditions. StateReady is fired by the state module,
    // which itself activates on ClientEvents.ClientReady — firing it requires a real client
    // plugin, not reachable from a per-module harness.
    test.skip('app-graph module (activates on allOf(SetupAppGraph, StateReady) — requires client plugin)', () => {});
    test.skip('surface module (activates on allOf(SetupReactSurface, StateReady) — requires client plugin)', () => {});
    test.skip('state module (activates on ClientEvents.ClientReady — requires client plugin)', () => {});
    test.skip('markdown module (activates on allOf(MarkdownEvents.SetupExtensions, StateReady) — requires client plugin)', () => {});
  });

  //
  // End-to-end plugin tests.
  //
  describe('plugin', () => {
    // Cannot autoStart: most modules require ClientEvents.ClientReady which is not fired here.
    test('activates translations at minimum', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [NativeFilesystemPlugin()], autoStart: false });
      await harness.fire(AppActivationEvents.SetupTranslations);
      expect(harness.getAll(AppCapabilities.Translations).flat().length).toBeGreaterThan(0);
    });
  });
});

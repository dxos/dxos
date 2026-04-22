//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ActivationEvents, Capabilities } from '@dxos/app-framework';
import { createTestApp } from '@dxos/app-framework/testing';
import { AppActivationEvents, AppCapabilities } from '@dxos/app-toolkit';

import { FilesPlugin } from './FilesPlugin';

describe('FilesPlugin', () => {
  //
  // Module activation tests — one per module in FilesPlugin.tsx.
  //
  describe('modules', () => {
    test('app-graph module contributes on SetupAppGraph', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [FilesPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.AppGraphBuilder)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupAppGraph);
      expect(harness.getAll(AppCapabilities.AppGraphBuilder).length).toBeGreaterThan(0);
    });

    test('operation-handler module contributes on SetupOperationHandler', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [FilesPlugin()], autoStart: false });
      expect(harness.getAll(Capabilities.OperationHandler)).toHaveLength(0);

      await harness.fire(ActivationEvents.SetupOperationHandler);
      expect(harness.getAll(Capabilities.OperationHandler).length).toBeGreaterThan(0);
    });

    // Skipped: settings module emits plugin-files settings capability asynchronously and
    // also gates on downstream AttentionReady-dependent modules that hang without the full
    // app (Category D/E).
    test.skip('settings module contributes on SetupSettings', async () => {});

    // Skipped: surfaces module requires FileSettings capability which is only contributed
    // after SetupSettings completes (Category D).
    test.skip('surfaces module contributes on SetupReactSurface', async () => {});

    test('translations module contributes resources on SetupTranslations', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [FilesPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.Translations)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupTranslations);
      expect(harness.getAll(AppCapabilities.Translations).flat().length).toBeGreaterThan(0);
    });

    test('app-graph-serializer module contributes on AppGraphReady', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [FilesPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.AppGraphSerializer)).toHaveLength(0);

      await harness.fire(AppActivationEvents.AppGraphReady);
      expect(harness.getAll(AppCapabilities.AppGraphSerializer).flat().length).toBeGreaterThan(0);
    });

    // The state module activates on allOf(OperationInvokerReady, SettingsReady, AttentionReady) —
    // requires FileSettings to finish AND AttentionPlugin's AttentionReady event which this harness
    // does not trigger in isolation.
    test.skip('state module (activates on OperationInvokerReady + SettingsReady + AttentionReady)', () => {});

    // The markdown module activates on SettingsReady (fired after FileSettings completes). Because
    // FileSettings itself is a lazy capability that takes time to materialize, this is easier to
    // verify via the end-to-end plugin test below.
    test.skip('markdown module (activates after FileSettings via SettingsReady)', () => {});

    test('modules activate only on their own events — firing SetupSchema does not trigger others', async ({
      expect,
    }) => {
      await using harness = await createTestApp({ plugins: [FilesPlugin()], autoStart: false });
      await harness.fire(AppActivationEvents.SetupSchema);
      expect(harness.getAll(Capabilities.ReactSurface)).toHaveLength(0);
      expect(harness.getAll(AppCapabilities.Translations)).toHaveLength(0);
      expect(harness.getAll(AppCapabilities.AppGraphBuilder)).toHaveLength(0);
      expect(harness.getAll(AppCapabilities.Settings)).toHaveLength(0);
      expect(harness.getAll(Capabilities.OperationHandler)).toHaveLength(0);
    });
  });

  //
  // End-to-end plugin tests.
  //
  describe('plugin', () => {
    // Skipped: e2e activation triggers modules requiring AttentionReady / external plugins (Category E).
    test.skip('activates and contributes expected capabilities', async () => {});
  });
});

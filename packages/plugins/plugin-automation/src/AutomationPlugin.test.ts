//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ActivationEvents, Capabilities } from '@dxos/app-framework';
import { createTestApp } from '@dxos/app-framework/testing';
import { AppActivationEvents, AppCapabilities } from '@dxos/app-toolkit';
import { Trigger } from '@dxos/functions';
import { Operation } from '@dxos/operation';

import { AutomationPlugin } from './AutomationPlugin';

describe('AutomationPlugin', () => {
  //
  // Module activation tests — one per module in AutomationPlugin.tsx.
  //
  describe('modules', () => {
    // Skipped: AppGraphBuilder is only exported from browser #capabilities; the node subpath
    // does not export it so the module.activate is undefined under vitest node (Category A).
    test.skip('app-graph module contributes on SetupAppGraph', async () => {});

    // Skipped: OperationHandler is only exported from browser #capabilities; not available in node.
    test.skip('operation-handler module contributes on SetupOperationHandler', async () => {});

    test('schema module contributes PersistentOperation + Trigger on SetupSchema', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [AutomationPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.Schema)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupSchema);
      const schemas = harness.getAll(AppCapabilities.Schema).flat();
      expect(schemas).toContain(Operation.PersistentOperation);
      expect(schemas).toContain(Trigger.Trigger);
    });

    // Skipped: ReactSurface is only exported from browser #capabilities; not available in node.
    test.skip('surfaces module contributes on SetupReactSurface', async () => {});

    test('translations module contributes resources on SetupTranslations', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [AutomationPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.Translations)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupTranslations);
      expect(harness.getAll(AppCapabilities.Translations).flat().length).toBeGreaterThan(0);
    });

    // The compute-runtime module activates on ClientEvents.ClientReady, which requires the Client
    // plugin to initialize a real Client. That is too heavy for a unit regression test.
    test.skip('compute-runtime module (activates on ClientReady — requires ClientPlugin)', () => {});
  });

  //
  // End-to-end plugin tests.
  //
  describe('plugin', () => {
    // Skipped: end-to-end activation requires browser-only #capabilities (ReactSurface, etc.).
    test.skip('activates and contributes expected capabilities', async () => {});
  });
});

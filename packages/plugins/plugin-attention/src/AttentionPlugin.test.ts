//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ActivationEvents, Capabilities } from '@dxos/app-framework';
import { createTestApp } from '@dxos/app-framework/testing';

import { AttentionPlugin } from './AttentionPlugin';
import { AttentionCapabilities } from '#types';

describe('AttentionPlugin', () => {
  //
  // Module activation tests — one per module in AttentionPlugin.ts.
  //
  describe('modules', () => {
    test('operation-handler module contributes on SetupOperationHandler', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [AttentionPlugin()], autoStart: false });
      expect(harness.getAll(Capabilities.OperationHandler)).toHaveLength(0);

      await harness.fire(ActivationEvents.SetupOperationHandler);
      expect(harness.getAll(Capabilities.OperationHandler).length).toBeGreaterThan(0);
    });

    test('attention module contributes Attention + Selection on Startup', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [AttentionPlugin()], autoStart: false });
      expect(harness.getAll(AttentionCapabilities.Attention)).toHaveLength(0);
      expect(harness.getAll(AttentionCapabilities.Selection)).toHaveLength(0);

      await harness.fire(ActivationEvents.Startup);
      expect(harness.getAll(AttentionCapabilities.Attention).length).toBeGreaterThan(0);
      expect(harness.getAll(AttentionCapabilities.Selection).length).toBeGreaterThan(0);
    });

    test('react-context module contributes on Startup', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [AttentionPlugin()], autoStart: false });
      expect(harness.getAll(Capabilities.ReactContext)).toHaveLength(0);

      await harness.fire(ActivationEvents.Startup);
      expect(harness.getAll(Capabilities.ReactContext).length).toBeGreaterThan(0);
    });

    // The keyboard module activates on allOf(AppGraphReady, AttentionReady); AppGraphReady is fired
    // by graph plugin after the graph builds, so we can't exercise it here without a full composer harness.
    test.skip('keyboard module (activates on AppGraphReady + AttentionReady — requires graph plugin)', () => {});
  });

  //
  // End-to-end plugin tests.
  //
  describe('plugin', () => {
    test('activates and contributes attention capability', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [AttentionPlugin()] });
      expect(harness.getAll(AttentionCapabilities.Attention).length).toBeGreaterThan(0);
      expect(harness.getAll(AttentionCapabilities.Selection).length).toBeGreaterThan(0);
    });
  });
});

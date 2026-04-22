//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ActivationEvents, Capabilities } from '@dxos/app-framework';
import { createTestApp } from '@dxos/app-framework/testing';
import { AppActivationEvents, AppCapabilities } from '@dxos/app-toolkit';

import { NavTreePlugin } from './NavTreePlugin';
import { NODE_TYPE } from './containers';

describe('NavTreePlugin', () => {
  //
  // Module activation tests — one per module in NavTreePlugin.tsx.
  //
  describe('modules', () => {
    test('app-graph module contributes on SetupAppGraph', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [NavTreePlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.AppGraphBuilder)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupAppGraph);
      expect(harness.getAll(AppCapabilities.AppGraphBuilder).length).toBeGreaterThan(0);
    });

    test('metadata module contributes NODE_TYPE metadata on SetupMetadata', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [NavTreePlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.Metadata)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupMetadata);
      const metadata = harness.getAll(AppCapabilities.Metadata);
      expect(metadata.some((entry) => entry.id === NODE_TYPE)).toBe(true);
    });

    test('operation-handler module contributes on SetupOperationHandler', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [NavTreePlugin()], autoStart: false });
      expect(harness.getAll(Capabilities.OperationHandler)).toHaveLength(0);

      await harness.fire(ActivationEvents.SetupOperationHandler);
      expect(harness.getAll(Capabilities.OperationHandler).length).toBeGreaterThan(0);
    });

    test('surface module contributes on SetupReactSurface', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [NavTreePlugin()], autoStart: false });
      expect(harness.getAll(Capabilities.ReactSurface)).toHaveLength(0);

      await harness.fire(ActivationEvents.SetupReactSurface);
      expect(harness.getAll(Capabilities.ReactSurface).flat().length).toBeGreaterThan(0);
    });

    test('translations module contributes resources on SetupTranslations', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [NavTreePlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.Translations)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupTranslations);
      expect(harness.getAll(AppCapabilities.Translations).flat().length).toBeGreaterThan(0);
    });

    // The state module activates on AppActivationEvents.LayoutReady, which is fired by the
    // layout plugin after layout construction — not reachable from a per-module harness.
    test.skip('state module (activates on LayoutReady — requires layout plugin)', () => {});

    // The expose module requires allOf(OperationInvokerReady, AppGraphReady, LayoutReady, StateReady).
    test.skip('expose module (activates on composite of OperationInvokerReady, AppGraphReady, LayoutReady, StateReady)', () => {});

    // The keyboard module requires allOf(AppGraphReady, OperationInvokerReady); AppGraphReady
    // is fired by the graph plugin.
    test.skip('keyboard module (activates on allOf(AppGraphReady, OperationInvokerReady))', () => {});
  });

  //
  // End-to-end plugin tests.
  //
  describe('plugin', () => {
    test('activates and contributes expected capabilities', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [NavTreePlugin()] });
      const surfaces = harness.getAll(Capabilities.ReactSurface).flat();
      expect(surfaces.length).toBeGreaterThan(0);
    });
  });
});

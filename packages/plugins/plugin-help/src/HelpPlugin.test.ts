//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ActivationEvents, Capabilities } from '@dxos/app-framework';
import { createTestApp } from '@dxos/app-framework/testing';
import { AppActivationEvents, AppCapabilities } from '@dxos/app-toolkit';

import { HelpPlugin } from './HelpPlugin';
import { HelpCapabilities } from './types';

describe('HelpPlugin', () => {
  //
  // Module activation tests — one per module in HelpPlugin.tsx.
  //
  describe('modules', () => {
    test('app-graph module contributes on SetupAppGraph', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [HelpPlugin({} as any)], autoStart: false });
      expect(harness.getAll(AppCapabilities.AppGraphBuilder)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupAppGraph);
      expect(harness.getAll(AppCapabilities.AppGraphBuilder).length).toBeGreaterThan(0);
    });

    test('operation-handler module contributes on SetupOperationHandler', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [HelpPlugin({} as any)], autoStart: false });
      expect(harness.getAll(Capabilities.OperationHandler)).toHaveLength(0);

      await harness.fire(ActivationEvents.SetupOperationHandler);
      expect(harness.getAll(Capabilities.OperationHandler).length).toBeGreaterThan(0);
    });

    test('surfaces module contributes on SetupReactSurface', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [HelpPlugin({} as any)], autoStart: false });
      expect(harness.getAll(Capabilities.ReactSurface)).toHaveLength(0);

      await harness.fire(ActivationEvents.SetupReactSurface);
      expect(harness.getAll(Capabilities.ReactSurface).flat().length).toBeGreaterThan(0);
    });

    test('translations module contributes resources on SetupTranslations', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [HelpPlugin({} as any)], autoStart: false });
      expect(harness.getAll(AppCapabilities.Translations)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupTranslations);
      expect(harness.getAll(AppCapabilities.Translations).flat().length).toBeGreaterThan(0);
    });

    test('state module contributes HelpCapabilities.State on Startup', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [HelpPlugin({} as any)], autoStart: false });
      expect(harness.getAll(HelpCapabilities.State)).toHaveLength(0);

      await harness.fire(ActivationEvents.Startup);
      expect(harness.getAll(HelpCapabilities.State).length).toBeGreaterThan(0);
    });

    test('react-root module contributes ReactRoot on Startup', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [HelpPlugin({} as any)], autoStart: false });
      expect(harness.getAll(Capabilities.ReactRoot)).toHaveLength(0);

      await harness.fire(ActivationEvents.Startup);
      expect(harness.getAll(Capabilities.ReactRoot).length).toBeGreaterThan(0);
    });

    test('modules activate only on their own events — firing SetupTranslations does not trigger others', async ({
      expect,
    }) => {
      await using harness = await createTestApp({ plugins: [HelpPlugin({} as any)], autoStart: false });
      await harness.fire(AppActivationEvents.SetupTranslations);
      expect(harness.getAll(Capabilities.ReactSurface)).toHaveLength(0);
      expect(harness.getAll(AppCapabilities.AppGraphBuilder)).toHaveLength(0);
      expect(harness.getAll(Capabilities.OperationHandler)).toHaveLength(0);
      expect(harness.getAll(HelpCapabilities.State)).toHaveLength(0);
      expect(harness.getAll(Capabilities.ReactRoot)).toHaveLength(0);
    });
  });

  //
  // End-to-end plugin tests.
  //
  describe('plugin', () => {
    test('activates and contributes expected capabilities', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [HelpPlugin({} as any)] });
      expect(harness.getAll(Capabilities.ReactSurface).flat().length).toBeGreaterThan(0);
      expect(harness.getAll(HelpCapabilities.State).length).toBeGreaterThan(0);
    });
  });
});

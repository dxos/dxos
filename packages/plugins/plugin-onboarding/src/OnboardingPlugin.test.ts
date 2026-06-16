//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { AppActivationEvents } from '@dxos/app-toolkit';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { OnboardingPlugin } from '#plugin';

import { meta } from './meta';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('OnboardingPlugin', () => {
  /**
   * Verifies that each capability module in a plugin activates on the event its `addXxxModule`
   * helper (or explicit `Plugin.addModule`) declares. Use `createComposerTestApp` for the headless
   * core (Attention, Graph, ProcessManager, Settings); pass the plugin under test via `plugins`.
   * Fire additional events (`harness.fire(event)`) for modules that activate lazily or outside the
   * default startup sequence.
   *
   * Key startup side-effects to know:
   * - `ProcessManagerPlugin` fires `SetupProcessManager` on Startup → `OperationHandler` activates.
   * - `GraphPlugin` fires `SetupAppGraph` on Startup (after `SetupSettings`) → `AppGraphBuilder` activates.
   * - `SetupTranslations` is NOT fired on Startup — fire it explicitly to test translations modules.
   * - `SetupReactSurface` is auto-fired by `createTestApp` alongside Startup → `ReactSurface` activates.
   *
   * @idiom org.dxos.plugin-testing.pluginModuleActivation
   *   applies: Writing a basic activation smoke-test for any Composer plugin
   *   instead-of: Manually inspecting PluginManager internals or relying on e2e tests for activation checks
   *   uses: {@link createComposerTestApp}, {@link AppActivationEvents}
   *   related: org.dxos.app-framework.testing.operationCapture
   */
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [OnboardingPlugin({ generateExemplarSpace: false })],
    });

    // Startup + SetupReactSurface activate core modules.
    // ProcessManagerPlugin fires SetupProcessManager on Startup → OperationHandler activates.
    // GraphPlugin fires SetupAppGraph on Startup (after SetupSettings) → AppGraphBuilder activates.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([
        moduleId('settings'),
        moduleId('oauth-recovery-redirect'),
        moduleId('ReactSurface'),
        moduleId('AppGraphBuilder'),
        moduleId('OperationHandler'),
      ]),
    );

    // Translations activate on SetupTranslations, which is fired separately from Startup.
    await harness.fire(AppActivationEvents.SetupTranslations);
    expect(harness.manager.getActive()).toContain(moduleId('translations'));
  });
});

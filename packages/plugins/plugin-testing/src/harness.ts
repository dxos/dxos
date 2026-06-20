//
// Copyright 2026 DXOS.org
//

import { type Plugin, ProcessManagerPlugin } from '@dxos/app-framework';
import { createTestApp, type TestAppOptions, type TestHarness } from '@dxos/app-framework/testing';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { AttentionPlugin } from '@dxos/plugin-attention/testing';
import { GraphPlugin } from '@dxos/plugin-graph/testing';
import { SettingsPlugin } from '@dxos/plugin-settings/testing';

export type ComposerTestAppOptions = Omit<TestAppOptions, 'plugins'> & {
  /** Plugins to register in addition to the Composer core plugins. */
  plugins?: Plugin.Plugin[];
  /**
   * Whether to include `ThemePlugin` in the core plugin set.
   * Defaults to `false` — `ThemePlugin` requires a browser DOM and breaks Node-only tests.
   * Set to `true` (with jsdom/happy-dom) when rendering React surfaces.
   */
  theme?: boolean;
};

/**
 * Headless core plugins for the test harness — the subset of `corePlugins()`
 * that can be activated without a browser DOM.
 */
const headlessCorePlugins = (): Plugin.Plugin[] => [
  AttentionPlugin(),
  GraphPlugin(),
  ProcessManagerPlugin(),
  SettingsPlugin(),
];

/**
 * Creates a TestHarness pre-loaded with the Composer core plugins
 * (Attention, Graph, ProcessManager, Settings, optionally Theme).
 *
 * For a ClientPlugin-backed harness, pass `ClientPlugin({ ... })` via `plugins`.
 *
 * @idiom org.dxos.plugin-testing.pluginModuleActivation
 *   applies: Writing a basic activation smoke-test for any Composer plugin
 *   instead-of: Manually inspecting PluginManager internals or relying on e2e tests for activation checks
 *   uses: {@link createComposerTestApp}, {@link AppActivationEvents}
 *   related: org.dxos.app-framework.testing.operationCapture
 */
export const createComposerTestApp = async (opts: ComposerTestAppOptions = {}): Promise<TestHarness> => {
  const { plugins = [], theme = false, ...rest } = opts;
  const core = headlessCorePlugins();
  if (theme) {
    const { ThemePlugin } = await import('@dxos/plugin-theme/testing');
    const { defaultTx } = await import('@dxos/react-ui');
    core.push(ThemePlugin({ tx: defaultTx }));
  }
  return createTestApp({
    // Composer always fires SetupSettings before Startup so that settings modules
    // activate before graph builders (which use allOf(SetupSettings, SetupAppGraph)).
    setupEvents: [AppActivationEvents.SetupSettings],
    ...rest,
    plugins: [...core, ...plugins],
  });
};

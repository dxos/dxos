//
// Copyright 2026 DXOS.org
//

import { OperationPlugin, type Plugin, RuntimePlugin } from '@dxos/app-framework';
import { createTestApp, type TestAppOptions, type TestHarness } from '@dxos/app-framework/testing';
import { AttentionPlugin } from '@dxos/plugin-attention';
import { GraphPlugin } from '@dxos/plugin-graph';
import { SettingsPlugin } from '@dxos/plugin-settings';

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
  OperationPlugin(),
  RuntimePlugin(),
  SettingsPlugin(),
];

/**
 * Creates a TestHarness pre-loaded with the Composer core plugins
 * (Attention, Graph, Operation, Runtime, Settings, optionally Theme).
 *
 * For a ClientPlugin-backed harness, pass `ClientPlugin({ ... })` via `plugins`.
 */
export const createComposerTestApp = async (opts: ComposerTestAppOptions = {}): Promise<TestHarness> => {
  const { plugins = [], theme = false, ...rest } = opts;
  const core = headlessCorePlugins();
  if (theme) {
    const { ThemePlugin } = await import('@dxos/plugin-theme');
    const { defaultTx } = await import('@dxos/ui-theme');
    core.push(ThemePlugin({ tx: defaultTx }));
  }
  return createTestApp({
    ...rest,
    plugins: [...core, ...plugins],
  });
};

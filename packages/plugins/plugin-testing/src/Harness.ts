//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Plugin from '@dxos/app-framework/Plugin';
import * as ProcessManagerPlugin from '@dxos/app-framework/ProcessManagerPlugin';
import { type TestAppOptions, type TestHarness, createTestApp } from '@dxos/app-framework/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
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
  AttentionPlugin.make(),
  GraphPlugin.make(),
  ProcessManagerPlugin.make(),
  SettingsPlugin.make(),
];

/**
 * Creates a TestHarness pre-loaded with the Composer core plugins
 * (Attention, Graph, ProcessManager, Settings, optionally Theme).
 *
 * For a ClientPlugin-backed harness, pass `ClientPlugin.make({ ... })` via `plugins`.
 *
 * @idiom org.dxos.plugin-testing.pluginModuleActivation
 *   applies: Writing a basic activation smoke-test for any Composer plugin
 *   instead-of: Manually inspecting PluginManager internals or relying on e2e tests for activation checks
 *   uses: {@link createComposerTestApp}, {@link AppActivationEvents}
 *   related: org.dxos.app-framework.testing.operationCapture
 */
export const createComposerTestApp = async (opts: ComposerTestAppOptions = {}): Promise<TestHarness> => {
  const { plugins: _, theme: __, ...rest } = opts;
  return createTestApp({
    ...rest,
    plugins: await composerPlugins(opts),
  });
};

/**
 * Imports every lazy module of the harness's plugins without activating any of them.
 * Await it at a test file's top level: the first harness boot otherwise loads ~1,000 modules
 * inside the first test, against its timeout.
 */
export const preload = async (opts: Pick<ComposerTestAppOptions, 'plugins' | 'theme'> = {}): Promise<void> => {
  const plugins = await Promise.all(
    (await composerPlugins(opts)).map((plugin) => EffectEx.runPromise(Plugin.resolveLazy(plugin))),
  );
  await Promise.all(plugins.flatMap((plugin) => plugin.modules.map((module) => module.load?.())));
};

const composerPlugins = async ({
  plugins = [],
  theme = false,
}: Pick<ComposerTestAppOptions, 'plugins' | 'theme'>): Promise<Plugin.Plugin[]> => {
  const core = headlessCorePlugins();
  if (theme) {
    const { ThemePlugin } = await import('@dxos/plugin-theme/testing');
    const { defaultTx } = await import('@dxos/react-ui/Theme');
    core.push(ThemePlugin.make({ tx: defaultTx }));
  }
  return [...core, ...plugins];
};

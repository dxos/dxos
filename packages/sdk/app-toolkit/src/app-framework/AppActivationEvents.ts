//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { ActivationEvent as ActivationEvent$ } from '@dxos/app-framework';

import * as AppCapabilities from './AppCapabilities';

/**
 * Fired to load settings-related plugins before startup.
 * @deprecated Contribute `AppCapabilities.Settings` from a dependency-mode module instead.
 */
export const SetupSettings = ActivationEvent$.make('org.dxos.app-framework.event.setupSettings');

/**
 * Fired before {@link SetupAppGraph}. Activates connector capability modules
 * so service plugins register their OAuth/sync handlers before the app graph
 * queries them.
 * @deprecated Declare capability dependencies instead of ordering events.
 */
export const SetupConnectors = ActivationEvent$.make('org.dxos.app-framework.event.setupConnectors');

/**
 * Fired before the graph is created.
 * @deprecated Contribute `AppCapabilities.AppGraphBuilder` from a dependency-mode module instead.
 */
export const SetupAppGraph = ActivationEvent$.make('org.dxos.app-framework.event.setupGraph');

/**
 * Fired to activate modules that contribute static plugin assets (e.g. the
 * bundled `PLUGIN.mdl` spec) via `AppCapabilities.PluginAsset`.
 * Consumers (plugin-code's spec viewer, registry surfaces, …) yield this
 * event before reading `Capability.getAll(AppCapabilities.PluginAsset)`.
 * @deprecated Contribute `AppCapabilities.PluginAsset` from a dependency-mode module; consumers use the live contributions view.
 */
export const SetupPluginAssets = ActivationEvent$.make('org.dxos.app-framework.event.setupPluginAssets');

/**
 * Fired before the translations provider is created.
 * @deprecated Contribute `AppCapabilities.Translations` from a dependency-mode module instead.
 */
export const SetupTranslations = ActivationEvent$.make('org.dxos.app-framework.event.setupTranslations');

/**
 * Fired before the schema is created.
 * @deprecated Contribute `AppCapabilities.Schema` from a dependency-mode module instead.
 */
export const SetupSchema = ActivationEvent$.make('org.dxos.app-framework.event.setupSchema');

/**
 * Fired to load any newly available artifacts definitions.
 * @deprecated Contribute `AppCapabilities.SkillDefinition` from a dependency-mode module instead.
 */
export const SetupArtifactDefinition = ActivationEvent$.make('org.dxos.app-framework.event.setupArtifactDefinition');

/**
 * Fired when the graph is ready.
 * @deprecated Declare `requires: [AppCapabilities.AppGraph]` instead.
 */
export const AppGraphReady = ActivationEvent$.make('org.dxos.app-framework.event.graphReady');

/**
 * Fired once the {@link AppCapabilities.ProgressRegistry} has been contributed,
 * so consumers can gate activation on the registry being available without
 * depending on the plugin that provides it.
 * @deprecated Declare `requires: [AppCapabilities.ProgressRegistry]` instead.
 */
export const ProgressRegistryReady = ActivationEvent$.make('org.dxos.app-framework.event.progressRegistryReady');

/**
 * Fired when plugin state is ready.
 */
export const createStateEvent = (specifier: string) =>
  ActivationEvent$.make('org.dxos.app-framework.event.state', specifier);
export const LayoutReady = createStateEvent(AppCapabilities.LAYOUT_CAPABILITY_ID);

/**
 * Fired when a specific settings capability is ready.
 */
export const createSettingsEvent = (specifier: string) =>
  ActivationEvent$.make('org.dxos.app-framework.event.settings', specifier);

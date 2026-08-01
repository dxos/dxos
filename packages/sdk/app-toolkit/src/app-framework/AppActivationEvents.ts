//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { ActivationEvent as ActivationEvent$ } from '@dxos/app-framework';

import * as AppCapabilities from './AppCapabilities';

/**
 * Fired to load settings-related plugins before startup.
 */
export const SetupSettings = ActivationEvent$.make('org.dxos.app-framework.event.setupSettings');

/**
 * Fired before {@link SetupAppGraph}. Activates connector capability modules
 * so service plugins register their OAuth/sync handlers before the app graph
 * queries them.
 */
export const SetupConnectors = ActivationEvent$.make('org.dxos.app-framework.event.setupConnectors');

/**
 * Fired before the graph is created.
 */
export const SetupAppGraph = ActivationEvent$.make('org.dxos.app-framework.event.setupGraph');

/**
 * Fired to activate modules that contribute static plugin assets (e.g. the
 * bundled `PLUGIN.mdl` spec) via `AppCapabilities.PluginAsset`.
 * Consumers (plugin-code's spec viewer, registry surfaces, …) yield this
 * event before reading `Capability.getAll(AppCapabilities.PluginAsset)`.
 */
export const SetupPluginAssets = ActivationEvent$.make('org.dxos.app-framework.event.setupPluginAssets');

/**
 * Fired before the translations provider is created.
 */
export const SetupTranslations = ActivationEvent$.make('org.dxos.app-framework.event.setupTranslations');

/**
 * Fired before the schema is created.
 */
export const SetupSchema = ActivationEvent$.make('org.dxos.app-framework.event.setupSchema');

/**
 * Fired to load any newly available artifacts definitions.
 */
export const SetupArtifactDefinition = ActivationEvent$.make('org.dxos.app-framework.event.setupArtifactDefinition');

/**
 * Fired when the graph is ready.
 */
export const AppGraphReady = ActivationEvent$.make('org.dxos.app-framework.event.graphReady');

/**
 * Fired once the {@link AppCapabilities.ProgressRegistry} has been contributed,
 * so consumers can gate activation on the registry being available without
 * depending on the plugin that provides it.
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

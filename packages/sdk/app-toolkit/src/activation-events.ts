//
// Copyright 2025 DXOS.org
//

import { ActivationEvent as ActivationEvent$ } from '@dxos/app-framework';

import { AppCapabilities } from './capabilities';

export namespace AppActivationEvents {
  /**
   * Fired to load settings-related plugins before startup.
   */
  export const SetupSettings = ActivationEvent$.make('dxos.org/app-framework/event/setup-settings');

  /**
   * Fired to load any newly available metadata.
   */
  export const SetupMetadata = ActivationEvent$.make('dxos.org/app-framework/event/setup-metadata');

  /**
   * Fired before the graph is created.
   */
  export const SetupAppGraph = ActivationEvent$.make('dxos.org/app-framework/event/setup-graph');

  /**
   * Fired before the translations provider is created.
   */
  export const SetupTranslations = ActivationEvent$.make('dxos.org/app-framework/event/setup-translations');

  /**
   * Fired before the schema is created.
   */
  export const SetupSchema = ActivationEvent$.make('dxos.org/app-framework/event/setup-schema');

  /**
   * Fired to load any newly available artifacts definitions.
   */
  export const SetupArtifactDefinition = ActivationEvent$.make(
    'dxos.org/app-framework/event/setup-artifact-definition',
  );

  /**
   * Fired when the graph is ready.
   */
  export const AppGraphReady = ActivationEvent$.make('dxos.org/app-framework/event/graph-ready');

  /**
   * Fired when plugin state is ready.
   */
  export const createStateEvent = (specifier: string) =>
    ActivationEvent$.make('dxos.org/app-framework/event/state', specifier);
  export const LayoutReady = createStateEvent(AppCapabilities.Layout.identifier);

  /**
   * Fired when a specific settings capability is ready.
   */
  export const createSettingsEvent = (specifier: string) =>
    ActivationEvent$.make('dxos.org/app-framework/event/settings', specifier);
}

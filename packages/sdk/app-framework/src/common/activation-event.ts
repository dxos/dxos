//
// Copyright 2025 DXOS.org
//

import { ActivationEvent as ActivationEvent$ } from '../core';

import { Capability } from './capability';

export namespace ActivationEvent {
  /**
   * Fired when the app is started.
   */
  export const Startup = ActivationEvent$.make('dxos.org/app-framework/event/startup');

  //
  // Dependent Events
  //

  /**
   * Fired to load any newly available surfaces.
   */
  export const SetupReactSurface = ActivationEvent$.make('dxos.org/app-framework/event/setup-react-surface');

  /**
   * Fired to load any newly available metadata.
   */
  export const SetupMetadata = ActivationEvent$.make('dxos.org/app-framework/event/setup-metadata');

  /**
   * Fired before the intent dispatcher is activated.
   */
  export const SetupIntentResolver = ActivationEvent$.make('dxos.org/app-framework/event/setup-intent-resolver');

  /**
   * Fired before the settings store is activated.
   */
  export const SetupSettings = ActivationEvent$.make('dxos.org/app-framework/event/setup-settings');

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
  // TODO(burdon): Rename.
  export const SetupArtifactDefinition = ActivationEvent$.make(
    'dxos.org/app-framework/event/setup-artifact-definition',
  );

  //
  // Triggered Events
  //

  /**
   * Fired after the intent dispatcher is ready.
   */
  export const DispatcherReady = ActivationEvent$.make('dxos.org/app-framework/event/dispatcher-ready');

  /**
   * Fired after the settings store is ready.
   */
  export const SettingsReady = ActivationEvent$.make('dxos.org/app-framework/event/settings-ready');

  /**
   * Fired when the graph is ready.
   */
  export const AppGraphReady = ActivationEvent$.make('dxos.org/app-framework/event/graph-ready');

  /**
   * Fired when plugin state is ready.
   */
  export const createStateEvent = (specifier: string) =>
    ActivationEvent$.make('dxos.org/app-framework/event/state', specifier);
  export const LayoutReady = createStateEvent(Capability.Layout.identifier);
}

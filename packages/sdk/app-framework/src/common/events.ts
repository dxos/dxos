//
// Copyright 2025 DXOS.org
//

import { defineEvent } from '../core';

import { Capabilities } from './capabilities';

export namespace Events {
  /**
   * Fired when the app is started.
   */
  export const Startup = defineEvent('dxos.org/app-framework/event/startup');

  //
  // Dependent Events
  //

  /**
   * Fired to load any newly available surfaces.
   */
  export const SetupReactSurface = defineEvent('dxos.org/app-framework/event/setup-react-surface');

  /**
   * Fired to load any newly available metadata.
   */
  export const SetupMetadata = defineEvent('dxos.org/app-framework/event/setup-metadata');

  /**
   * Fired before the intent dispatcher is activated.
   */
  export const SetupIntentResolver = defineEvent('dxos.org/app-framework/event/setup-intent-resolver');

  /**
   * Fired before the settings store is activated.
   */
  export const SetupSettings = defineEvent('dxos.org/app-framework/event/setup-settings');

  /**
   * Fired before the graph is created.
   */
  export const SetupAppGraph = defineEvent('dxos.org/app-framework/event/setup-graph');

  /**
   * Fired before the translations provider is created.
   */
  export const SetupTranslations = defineEvent('dxos.org/app-framework/event/setup-translations');

  /**
   * Fired to load any newly available artifacts definitions.
   */
  export const SetupArtifactDefinition = defineEvent('dxos.org/app-framework/event/setup-artifact-definition');

  //
  // Triggered Events
  //

  /**
   * Fired after the intent dispatcher is ready.
   */
  export const DispatcherReady = defineEvent('dxos.org/app-framework/event/dispatcher-ready');

  /**
   * Fired after the settings store is ready.
   */
  export const SettingsReady = defineEvent('dxos.org/app-framework/event/settings-ready');

  /**
   * Fired when the graph is ready.
   */
  export const AppGraphReady = defineEvent('dxos.org/app-framework/event/graph-ready');

  /**
   * Fired when plugin state is ready.
   */
  export const createStateEvent = (specifier: string) => defineEvent('dxos.org/app-framework/event/state', specifier);
  export const LayoutReady = createStateEvent(Capabilities.Layout.identifier);
}

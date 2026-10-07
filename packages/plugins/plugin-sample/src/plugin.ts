//
// Copyright 2025 DXOS.org
//

// Plugin definition — the main entry point for the plugin.
// `Plugin.define(meta)` creates a plugin builder with the plugin's identity.
// `.pipe()` chains module registrations. Each `Plugin.addModule()` call registers a
// capability module (authored via an `AppCapability.*` maker or `Capability.lazyModule`)
// that activates at the appropriate lifecycle event.
// `Plugin.make` finalizes the plugin (must be the last call in the chain).

import * as Plugin from '@dxos/app-framework/Plugin';

import {
  AppGraphBuilder,
  CreateObject,
  OperationHandler,
  PluginAsset,
  ReactSurface,
  SampleSettings,
  Schema,
  Translations,
} from '#capabilities';
import { meta } from '#meta';

export const SamplePlugin = Plugin.define(meta).pipe(
  // Registers graph builder extensions (actions, connectors, companions).
  // Activates when the app graph builder capability can be resolved.
  Plugin.addModule(AppGraphBuilder),

  // Registers type metadata for the framework's object system.
  // `createObject` is the factory called when users create this type via the UI.
  Plugin.addModule(CreateObject),

  // Registers operation handlers.
  Plugin.addModule(OperationHandler),

  // Finalizes the plugin. Must be the last call in the chain.
  Plugin.addModule(PluginAsset),

  // Registers React surface contributions.
  Plugin.addModule(ReactSurface),

  // Registers the settings module.
  Plugin.addModule(SampleSettings),

  // Registers ECHO schemas so the framework knows about this type.
  // Required for queries, serialization, and type resolution.
  Plugin.addModule(Schema),

  // Registers i18n translations.
  Plugin.addModule(Translations),
  Plugin.make,
);

export default SamplePlugin;

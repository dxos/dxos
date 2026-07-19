//
// Copyright 2025 DXOS.org
//

// Plugin definition — the main entry point for the plugin.
// `Plugin.define(meta)` creates a plugin builder with the plugin's identity.
// `.pipe()` chains module registrations. Each `Plugin.addLazyModule()` call registers a
// capability module (authored via an `AppCapability.*` maker or `Capability.lazyModule`)
// that activates at the appropriate lifecycle event.
// `Plugin.make` finalizes the plugin (must be the last call in the chain).

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';

import { AppGraphBuilder, CreateObject, OperationHandler, ReactSurface, SampleSettings } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { SampleItem } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const SamplePlugin = Plugin.define(meta).pipe(
  // Registers graph builder extensions (actions, connectors, companions).
  // Activates when the app graph builder capability can be resolved.
  Plugin.addLazyModule(AppGraphBuilder),

  // Registers type metadata for the framework's object system.
  // `createObject` is the factory called when users create this type via the UI.
  Plugin.addLazyModule(CreateObject),

  // Registers operation handlers.
  Plugin.addLazyModule(OperationHandler),

  // Registers ECHO schemas so the framework knows about this type.
  // Required for queries, serialization, and type resolution.
  Plugin.addLazyModule(AppCapability.schema([SampleItem.SampleItem])),

  // Registers the settings module.
  Plugin.addLazyModule(SampleSettings),

  // Registers React surface contributions.
  Plugin.addLazyModule(ReactSurface),

  // Registers i18n translations.
  Plugin.addLazyModule(AppCapability.translations(translations)),

  // Finalizes the plugin. Must be the last call in the chain.
  Plugin.addLazyModule(
    AppCapability.pluginAsset({
      pluginId: meta.profile.key,
      path: 'PLUGIN.mdl',
      content: pluginSpec,
      mimeType: 'application/x-mdl',
    }),
  ),
  Plugin.make,
);

export default SamplePlugin;

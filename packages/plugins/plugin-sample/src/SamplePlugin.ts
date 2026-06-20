//
// Copyright 2025 DXOS.org
//

// Plugin definition — the main entry point for the plugin.
// `Plugin.define(meta)` creates a plugin builder with the plugin's identity.
// `.pipe()` chains module registrations. Each `AppPlugin.add*Module()` helper
// registers a capability module that activates at the appropriate lifecycle event.
// `Plugin.make` finalizes the plugin (must be the last call in the chain).

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { AppGraphBuilder, CreateObject, SampleSettings, OperationHandler, ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { SampleItem } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const SamplePlugin = Plugin.define(meta).pipe(
  // Registers graph builder extensions (actions, connectors, companions).
  // Activates during `SetupAppGraph` event.
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),

  // Registers type metadata for the framework's object system.
  // `createObject` is the factory called when users create this type via the UI.
  AppPlugin.addCreateObjectModule({ activate: CreateObject }),

  // Registers operation handlers. Activates during `SetupProcessManager` event.
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),

  // Registers ECHO schemas so the framework knows about this type.
  // Required for queries, serialization, and type resolution.
  AppPlugin.addSchemaModule({ schema: [SampleItem.SampleItem] }),

  // Registers the settings module. Activates during `SetupSettings` event.
  AppPlugin.addSettingsModule({ activate: SampleSettings }),

  // Registers React surface contributions. Activates during `SetupReactSurface` event.
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),

  // Registers i18n translations.
  AppPlugin.addTranslationsModule({ translations }),

  // Finalizes the plugin. Must be the last call in the chain.
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default SamplePlugin;

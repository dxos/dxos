//
// Copyright 2025 DXOS.org
//

// Plugin definition — the main entry point for the plugin.
// `Plugin.define(meta)` creates a plugin builder with the plugin's identity.
// `.pipe()` chains module registrations. Each `AppPlugin.add*Module()` helper
// registers a capability module that activates at the appropriate lifecycle event.
// `Plugin.make` finalizes the plugin (must be the last call in the chain).

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Annotation, Type } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { type CreateObject } from '@dxos/plugin-space/types';
import { SpaceOperation } from '@dxos/plugin-space/operations';

import { AppGraphBuilder, ExemplarSettings, OperationHandler, ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { translations } from './translations';
import { ExemplarItem } from '#types';

export const ExemplarPlugin = Plugin.define(meta).pipe(
  // Registers graph builder extensions (actions, connectors, companions).
  // Activates during `SetupAppGraph` event.
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),

  // Registers type metadata for the framework's object system.
  // `createObject` is the factory called when users create this type via the UI.
  // The `icon` and `iconHue` are read from the schema's IconAnnotation.
  AppPlugin.addMetadataModule({
    metadata: {
      id: Type.getTypename(ExemplarItem.ExemplarItem),
      metadata: {
        icon: Annotation.IconAnnotation.get(ExemplarItem.ExemplarItem).pipe(Option.getOrThrow).icon,
        iconHue: Annotation.IconAnnotation.get(ExemplarItem.ExemplarItem).pipe(Option.getOrThrow).hue,
        createObject: ((props, options) =>
          Effect.gen(function* () {
            const object = ExemplarItem.make({ name: props.name });
            return yield* Operation.invoke(SpaceOperation.AddObject, {
              object,
              target: options.target,
              hidden: true,
              targetNodeId: options.targetNodeId,
            });
          })) satisfies CreateObject,
      },
    },
  }),

  // Registers operation handlers. Activates during `SetupOperationHandler` event.
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),

  // Registers ECHO schemas so the framework knows about this type.
  // Required for queries, serialization, and type resolution.
  AppPlugin.addSchemaModule({ schema: [ExemplarItem.ExemplarItem] }),

  // Registers the settings module. Activates during `SetupSettings` event.
  AppPlugin.addSettingsModule({ activate: ExemplarSettings }),

  // Registers React surface contributions. Activates during `SetupReactSurface` event.
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),

  // Registers i18n translations.
  AppPlugin.addTranslationsModule({ translations }),

  // Finalizes the plugin. Must be the last call in the chain.
  Plugin.make,
);

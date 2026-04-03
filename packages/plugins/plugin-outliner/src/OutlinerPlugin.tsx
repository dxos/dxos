//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Annotation } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { ClientEvents } from '@dxos/plugin-client/types';
import { type CreateObject } from '@dxos/plugin-space/types';
import { SpaceOperation } from '@dxos/plugin-space/operations';

import { AppGraphBuilder, Migrations, OperationHandler, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { Journal, Outline } from './types';

export const OutlinerPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addMetadataModule({
    metadata: [
      {
        id: Journal.Journal.typename,
        metadata: {
          icon: Annotation.IconAnnotation.get(Journal.Journal).pipe(Option.getOrThrow).icon,
          iconHue: Annotation.IconAnnotation.get(Journal.Journal).pipe(Option.getOrThrow).hue ?? 'white',
          createObject: ((props, options) =>
            Effect.gen(function* () {
              const object = Journal.make(props);
              return yield* Operation.invoke(SpaceOperation.AddObject, {
                object,
                target: options.target,
                hidden: true,
                targetNodeId: options.targetNodeId,
              });
            })) satisfies CreateObject,
        },
      },
      {
        id: Outline.Outline.typename,
        metadata: {
          icon: Annotation.IconAnnotation.get(Outline.Outline).pipe(Option.getOrThrow).icon,
          iconHue: Annotation.IconAnnotation.get(Outline.Outline).pipe(Option.getOrThrow).hue ?? 'white',
          createObject: ((props, options) =>
            Effect.gen(function* () {
              const object = Outline.make(props);
              return yield* Operation.invoke(SpaceOperation.AddObject, {
                object,
                target: options.target,
                hidden: true,
                targetNodeId: options.targetNodeId,
              });
            })) satisfies CreateObject,
        },
      },
    ],
  }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({
    schema: [Journal.JournalEntry, Journal.Journal, Outline.Outline],
  }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    activatesOn: ClientEvents.SetupMigration,
    activate: Migrations,
  }),
  Plugin.make,
);

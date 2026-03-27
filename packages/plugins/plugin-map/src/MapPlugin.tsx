//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { Annotation, Type } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { type CreateObject } from '@dxos/plugin-space/types';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { ViewModel } from '@dxos/schema';

import { AppGraphBuilder, BlueprintDefinition, MapState, OperationHandler, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { Map, MapAction } from './types';

export const MapPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  AppPlugin.addMetadataModule({
    metadata: {
      id: Type.getTypename(Map.Map),
      metadata: {
        icon: Annotation.IconAnnotation.get(Map.Map).pipe(Option.getOrThrow).icon,
        iconHue: Annotation.IconAnnotation.get(Map.Map).pipe(Option.getOrThrow).hue ?? 'white',
        inputSchema: MapAction.CreateMap,
        createObject: ((props, options) =>
          Effect.gen(function* () {
            const object = yield* Effect.promise(async () => {
              const view = props.typename
                ? (
                    await ViewModel.makeFromDatabase({
                      db: options.db,
                      typename: props.typename,
                      pivotFieldName: props.locationFieldName,
                    })
                  ).view
                : undefined;
              return Map.make({ name: props.name, view });
            });
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
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({ schema: [Map.Map] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    id: 'state',
    // TODO(wittjosiah): Does not integrate with settings store.
    //   Should this be a different event?
    //   Should settings store be renamed to be more generic?
    activatesOn: AppActivationEvents.SetupSettings,
    activate: MapState,
  }),
  Plugin.make,
);

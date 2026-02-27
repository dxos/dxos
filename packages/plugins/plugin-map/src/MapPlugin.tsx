//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { Type } from '@dxos/echo';
import { type CreateObject } from '@dxos/plugin-space/types';
import { View } from '@dxos/schema';

import { AppGraphBuilder, BlueprintDefinition, MapState, OperationResolver, ReactSurface } from './capabilities';
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
        icon: 'ph--compass--regular',
        iconHue: 'green',
        inputSchema: MapAction.CreateMap,
        createObject: ((props, { db }) =>
          Effect.promise(async () => {
            const view = props.typename
              ? (
                  await View.makeFromDatabase({
                    db,
                    typename: props.typename,
                    pivotFieldName: props.locationFieldName,
                  })
                ).view
              : undefined;
            return Map.make({ name: props.name, view });
          })) satisfies CreateObject,
      },
    },
  }),
  AppPlugin.addOperationResolverModule({ activate: OperationResolver }),
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

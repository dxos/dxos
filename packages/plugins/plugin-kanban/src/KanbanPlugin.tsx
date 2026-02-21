//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Type } from '@dxos/echo';
import { type CreateObject } from '@dxos/plugin-space/types';
import { View } from '@dxos/schema';

import { BlueprintDefinition, OperationResolver, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { CreateKanbanSchema, Kanban } from './types';

export const KanbanPlugin = Plugin.define(meta).pipe(
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  AppPlugin.addMetadataModule({
    metadata: {
      id: Type.getTypename(Kanban.Kanban),
      metadata: {
        icon: 'ph--kanban--regular',
        iconHue: 'green',
        inputSchema: CreateKanbanSchema,
        createObject: ((props, { db }) =>
          Effect.promise(async () => {
            const { view } = await View.makeFromDatabase({
              db,
              typename: props.typename,
              pivotFieldName: props.initialPivotColumn,
            });
            return Kanban.make({ name: props.name, view });
          })) satisfies CreateObject,
      },
    },
  }),
  AppPlugin.addOperationResolverModule({ activate: OperationResolver }),
  AppPlugin.addSchemaModule({ schema: [Kanban.Kanban] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);

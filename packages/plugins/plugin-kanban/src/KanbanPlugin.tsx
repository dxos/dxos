//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Annotation, Type } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { type CreateObject, SpaceOperation } from '@dxos/plugin-space/types';
import { ViewModel } from '@dxos/schema';

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
        icon: Annotation.IconAnnotation.get(Kanban.Kanban).pipe(Option.getOrThrow).icon,
        iconHue: Annotation.IconAnnotation.get(Kanban.Kanban).pipe(Option.getOrThrow).hue ?? 'white',
        inputSchema: CreateKanbanSchema,
        createObject: ((props, options) =>
          Effect.gen(function* () {
            const object = yield* Effect.promise(async () => {
              const { view } = await ViewModel.makeFromDatabase({
                db: options.db,
                typename: props.typename,
                pivotFieldName: props.initialPivotColumn,
              });
              return Kanban.make({ name: props.name, view });
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
  AppPlugin.addOperationResolverModule({ activate: OperationResolver }),
  AppPlugin.addSchemaModule({ schema: [Kanban.Kanban] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);

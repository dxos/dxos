//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Annotation, Type } from '@dxos/echo';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { type CreateObject } from '@dxos/plugin-space/types';
import { Table } from '@dxos/react-ui-table/types';
import { ViewModel } from '@dxos/schema';

import { BlueprintDefinition, OperationHandler } from '#capabilities';
import { meta } from '#meta';
import { CreateTableSchema } from '#operations';

export const TablePlugin = Plugin.define(meta).pipe(
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  AppPlugin.addMetadataModule({
    metadata: {
      id: Type.getTypename(Table.Table),
      metadata: {
        icon: Annotation.IconAnnotation.get(Table.Table).pipe(Option.getOrThrow).icon,
        iconHue: Annotation.IconAnnotation.get(Table.Table).pipe(Option.getOrThrow).hue ?? 'white',
        comments: 'unanchored',
        inputSchema: CreateTableSchema,
        createObject: ((props, options) =>
          Effect.gen(function* () {
            const object = yield* Effect.promise(async () => {
              const { view, jsonSchema } = await ViewModel.makeFromDatabase({
                db: options.db,
                typename: props.typename,
              });
              return Table.make({ name: props.name, view, jsonSchema });
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
  AppPlugin.addSchemaModule({ schema: [Table.Table] }),
  Plugin.make,
);

export default TablePlugin;

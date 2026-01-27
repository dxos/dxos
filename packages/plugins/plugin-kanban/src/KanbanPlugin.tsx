//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Common, Plugin } from '@dxos/app-framework';
import { Type } from '@dxos/echo';
import { type CreateObject } from '@dxos/plugin-space/types';
import { translations as kanbanTranslations } from '@dxos/react-ui-kanban';
import { Kanban } from '@dxos/react-ui-kanban/types';
import { View } from '@dxos/schema';

import { BlueprintDefinition, OperationResolver, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { CreateKanbanSchema } from './types';

export const KanbanPlugin = Plugin.define(meta).pipe(
  Common.Plugin.addTranslationsModule({ translations: [...translations, ...kanbanTranslations] }),
  Common.Plugin.addMetadataModule({
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
  Common.Plugin.addSchemaModule({ schema: [Kanban.Kanban] }),
  Common.Plugin.addSurfaceModule({ activate: ReactSurface }),
  Common.Plugin.addOperationResolverModule({ activate: OperationResolver }),
  Common.Plugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  Plugin.make,
);

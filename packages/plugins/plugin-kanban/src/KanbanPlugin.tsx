//
// Copyright 2023 DXOS.org
//

import { Common, Plugin, createIntent } from '@dxos/app-framework';
import { Type } from '@dxos/echo';
import { type CreateObjectIntent } from '@dxos/plugin-space/types';
import { translations as kanbanTranslations } from '@dxos/react-ui-kanban';
import { Kanban } from '@dxos/react-ui-kanban/types';

import { BlueprintDefinition, IntentResolver, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { CreateKanbanSchema, KanbanAction } from './types';

export const KanbanPlugin = Plugin.define(meta).pipe(
  Common.Plugin.addTranslationsModule({ translations: [...translations, ...kanbanTranslations] }),
  Common.Plugin.addMetadataModule({
    metadata: {
      id: Type.getTypename(Kanban.Kanban),
      metadata: {
        icon: 'ph--kanban--regular',
        iconHue: 'green',
        inputSchema: CreateKanbanSchema,
        createObjectIntent: ((props, options) =>
          createIntent(KanbanAction.Create, { ...props, space: options.db })) satisfies CreateObjectIntent,
      },
    },
  }),
  Common.Plugin.addSchemaModule({ schema: [Kanban.Kanban] }),
  Common.Plugin.addSurfaceModule({ activate: ReactSurface }),
  Common.Plugin.addIntentResolverModule({ activate: IntentResolver }),
  Common.Plugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  Plugin.make,
);

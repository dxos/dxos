//
// Copyright 2023 DXOS.org
//

import { Capabilities, Events, contributes, createIntent, defineModule, definePlugin } from '@dxos/app-framework';
import { Type } from '@dxos/echo';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { SpaceCapabilities } from '@dxos/plugin-space';
import { defineObjectForm } from '@dxos/plugin-space/types';
import { translations as kanbanTranslations } from '@dxos/react-ui-kanban';
import { Kanban } from '@dxos/react-ui-kanban/types';

import { BlueprintDefinition, IntentResolver, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { CreateKanbanSchema, KanbanAction } from './types';

export const KanbanPlugin = definePlugin(meta, () => [
  defineModule({
    id: `${meta.id}/module/translations`,
    activatesOn: Events.SetupTranslations,
    activate: () => contributes(Capabilities.Translations, [...translations, ...kanbanTranslations]),
  }),
  defineModule({
    id: `${meta.id}/module/metadata`,
    activatesOn: Events.SetupMetadata,
    activate: () =>
      contributes(Capabilities.Metadata, {
        id: Type.getTypename(Kanban.Kanban),
        metadata: {
          icon: 'ph--kanban--regular',
          iconHue: 'green',
        },
      }),
  }),
  defineModule({
    id: `${meta.id}/module/object-form`,
    activatesOn: ClientEvents.SetupSchema,
    activate: () =>
      contributes(
        SpaceCapabilities.ObjectForm,
        defineObjectForm({
          objectSchema: Kanban.Kanban,
          formSchema: CreateKanbanSchema,
          hidden: true,
          getIntent: (props, options) => createIntent(KanbanAction.Create, { ...props, space: options.space }),
        }),
      ),
  }),
  defineModule({
    id: `${meta.id}/module/schema`,
    activatesOn: ClientEvents.SetupSchema,
    activate: () => contributes(ClientCapabilities.Schema, [Kanban.Kanban]),
  }),
  defineModule({
    id: `${meta.id}/module/react-surface`,
    activatesOn: Events.SetupReactSurface,
    activate: ReactSurface,
  }),
  defineModule({
    id: `${meta.id}/module/intent-resolver`,
    activatesOn: Events.SetupIntentResolver,
    activate: IntentResolver,
  }),
  defineModule({
    id: `${meta.id}/module/blueprint`,
    activatesOn: Events.SetupArtifactDefinition,
    activate: BlueprintDefinition,
  }),
]);

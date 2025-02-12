//
// Copyright 2023 DXOS.org
//

import { createIntent, defineModule, contributes, Capabilities, Events, definePlugin } from '@dxos/app-framework';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { type Space } from '@dxos/react-client/echo';
import { KanbanType, translations as kanbanTranslations } from '@dxos/react-ui-kanban';

import { IntentResolver, ReactSurface } from './capabilities';
import { KANBAN_PLUGIN, meta } from './meta';
import translations from './translations';
import { KanbanAction } from './types';

export const KanbanPlugin = () =>
  definePlugin(meta, [
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
          id: KanbanType.typename,
          metadata: {
            createObject: (props: { name?: string }, options: { space: Space }) =>
              createIntent(KanbanAction.Create, { ...props, space: options.space }),
            placeholder: ['kanban title placeholder', { ns: KANBAN_PLUGIN }],
            icon: 'ph--kanban--regular',
          },
        }),
    }),
    defineModule({
      id: `${meta.id}/module/schema`,
      activatesOn: ClientEvents.SetupSchema,
      activate: () => contributes(ClientCapabilities.Schema, [KanbanType]),
    }),
    defineModule({
      id: `${meta.id}/module/react-surface`,
      activatesOn: Events.SetupSurfaces,
      activate: ReactSurface,
    }),
    defineModule({
      id: `${meta.id}/module/intent-resolver`,
      activatesOn: Events.SetupIntents,
      activate: IntentResolver,
    }),
  ]);

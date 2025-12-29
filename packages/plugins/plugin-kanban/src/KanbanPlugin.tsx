//
// Copyright 2023 DXOS.org
//

import { Capability, Common, Plugin, createIntent } from '@dxos/app-framework';
import { Type } from '@dxos/echo';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { type CreateObjectIntent } from '@dxos/plugin-space/types';
import { translations as kanbanTranslations } from '@dxos/react-ui-kanban';
import { Kanban } from '@dxos/react-ui-kanban/types';

import { BlueprintDefinition, IntentResolver, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { CreateKanbanSchema, KanbanAction } from './types';

export const KanbanPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'translations',
    activatesOn: Common.ActivationEvent.SetupTranslations,
    activate: () => Capability.contributes(Common.Capability.Translations, [...translations, ...kanbanTranslations]),
  }),
  Plugin.addModule({
    id: 'metadata',
    activatesOn: Common.ActivationEvent.SetupMetadata,
    activate: () =>
      Capability.contributes(Common.Capability.Metadata, {
        id: Type.getTypename(Kanban.Kanban),
        metadata: {
          icon: 'ph--kanban--regular',
          iconHue: 'green',
          inputSchema: CreateKanbanSchema,
          createObjectIntent: ((props, options) =>
            createIntent(KanbanAction.Create, { ...props, space: options.db })) satisfies CreateObjectIntent,
        },
      }),
  }),
  Plugin.addModule({
    id: 'schema',
    activatesOn: ClientEvents.SetupSchema,
    activate: () => Capability.contributes(ClientCapabilities.Schema, [Kanban.Kanban]),
  }),
  Plugin.addModule({
    id: 'react-surface',
    activatesOn: Common.ActivationEvent.SetupReactSurface,
    activate: ReactSurface,
  }),
  Plugin.addModule({
    id: 'intent-resolver',
    activatesOn: Common.ActivationEvent.SetupIntentResolver,
    activate: IntentResolver,
  }),
  Plugin.addModule({
    id: 'blueprint',
    activatesOn: Common.ActivationEvent.SetupArtifactDefinition,
    activate: BlueprintDefinition,
  }),
  Plugin.make,
);

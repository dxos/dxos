//
// Copyright 2023 DXOS.org
//

import { Capabilities, Events, contributes, createIntent, defineModule, definePlugin } from '@dxos/app-framework';
import { ClientEvents } from '@dxos/plugin-client';
import { SpaceCapabilities } from '@dxos/plugin-space';
import { defineObjectForm } from '@dxos/plugin-space/types';
import { translations as boardTranslations } from '@dxos/react-ui-board';

import { IntentResolver, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { Board } from './types';

export const BoardPlugin = definePlugin(meta, () => [
  defineModule({
    id: `${meta.id}/module/translations`,
    activatesOn: Events.SetupTranslations,
    activate: () => contributes(Capabilities.Translations, [...translations, ...boardTranslations]),
  }),
  defineModule({
    id: `${meta.id}/module/metadata`,
    activatesOn: Events.SetupMetadata,
    activate: () =>
      // TODO(burdon): "Metadata" here seems non-descriptive; is this specifically for the type? ObjectMetadata?
      contributes(Capabilities.Metadata, {
        id: Board.Board.typename,
        metadata: {
          icon: 'ph--squares-four--regular',
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
          objectSchema: Board.Board,
          getIntent: () => createIntent(Board.Create),
        }),
      ),
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
]);

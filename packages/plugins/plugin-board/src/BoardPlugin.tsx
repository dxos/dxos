//
// Copyright 2023 DXOS.org
//

import { defineModule, contributes, Capabilities, Events, definePlugin } from '@dxos/app-framework';
import { translations as boardTranslations } from '@dxos/react-ui-board';

import { IntentResolver, ReactSurface } from './capabilities';
import { meta } from './meta';
import translations from './translations';
import { BoardType } from './types';

export const BoardPlugin = () =>
  definePlugin(meta, [
    defineModule({
      id: `${meta.id}/module/translations`,
      activatesOn: Events.SetupTranslations,
      activate: () => contributes(Capabilities.Translations, [...translations, ...boardTranslations]),
    }),
    defineModule({
      id: `${meta.id}/module/metadata`,
      activatesOn: Events.SetupMetadata,
      activate: () =>
        contributes(Capabilities.Metadata, {
          id: BoardType.typename,
          metadata: {
            icon: 'ph--squares-four--regular',
          },
        }),
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

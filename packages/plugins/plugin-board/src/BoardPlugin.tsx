//
// Copyright 2023 DXOS.org
//

import { Capability, Common, Plugin, createIntent } from '@dxos/app-framework';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { type CreateObjectIntent } from '@dxos/plugin-space/types';
import { translations as boardTranslations } from '@dxos/react-ui-board';

import { IntentResolver, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { Board } from './types';

export const BoardPlugin = Plugin.define(meta).pipe(
  Common.Plugin.addTranslationsModule({ translations: [...translations, ...boardTranslations] }),
  Common.Plugin.addMetadataModule({
    metadata: {
      id: Board.Board.typename,
      metadata: {
        icon: 'ph--squares-four--regular',
        iconHue: 'green',
        creatObjectIntent: (() => createIntent(Board.Create)) satisfies CreateObjectIntent,
        addToCollectionOnCreate: true,
      },
    },
  }),
  Common.Plugin.addSchemaModule({ schema: [Board.Board] }),
  Common.Plugin.addSurfaceModule({ activate: ReactSurface }),
  Common.Plugin.addIntentResolverModule({ activate: IntentResolver }),
  Plugin.make,
);

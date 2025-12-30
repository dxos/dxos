//
// Copyright 2025 DXOS.org
//

import { Common, Plugin, createIntent } from '@dxos/app-framework';
import { Type } from '@dxos/echo';
import { type CreateObjectIntent } from '@dxos/plugin-space/types';

import { IntentResolver, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { Masonry, MasonryAction } from './types';

export const MasonryPlugin = Plugin.define(meta).pipe(
  Common.Plugin.addTranslationsModule({ translations }),
  Common.Plugin.addSurfaceModule({ activate: ReactSurface }),
  Common.Plugin.addMetadataModule({
    metadata: {
      id: Type.getTypename(Masonry.Masonry),
      metadata: {
        icon: 'ph--wall--regular',
        iconHue: 'green',
        inputSchema: MasonryAction.MasonryProps,
        createObjectIntent: ((props, options) =>
          createIntent(MasonryAction.CreateMasonry, { ...props, space: options.db })) satisfies CreateObjectIntent,
      },
    },
  }),
  Common.Plugin.addSchemaModule({ schema: [Masonry.Masonry] }),
  Common.Plugin.addIntentResolverModule({ activate: IntentResolver }),
  Plugin.make,
);

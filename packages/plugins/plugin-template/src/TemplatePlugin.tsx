//
// Copyright 2023 DXOS.org
//

import { Common, Plugin, createIntent } from '@dxos/app-framework';
import { type CreateObjectIntent } from '@dxos/plugin-space/types';

import { IntentResolver, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { Template } from './types';

export const TemplatePlugin = Plugin.define(meta).pipe(
  Common.Plugin.addTranslationsModule({ translations }),
  Common.Plugin.addMetadataModule({
    metadata: {
      id: Template.Data.typename,
      metadata: {
        icon: 'ph--asterisk--regular',
        iconHue: 'sky',
        createObjectIntent: (() => createIntent(Template.Create)) satisfies CreateObjectIntent,
        addToCollectionOnCreate: true,
      },
    },
  }),
  Common.Plugin.addSchemaModule({ schema: [Template.Data] }),
  Common.Plugin.addSurfaceModule({ activate: ReactSurface }),
  Common.Plugin.addIntentResolverModule({ activate: IntentResolver }),
  Plugin.make,
);

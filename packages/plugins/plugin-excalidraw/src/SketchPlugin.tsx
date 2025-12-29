//
// Copyright 2023 DXOS.org
//

import { Common, Plugin, createIntent } from '@dxos/app-framework';
import { Diagram } from '@dxos/plugin-sketch/types';
import { type CreateObjectIntent } from '@dxos/plugin-space/types';

import { ExcalidrawSettings, IntentResolvers, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { SketchAction } from './types';

export const ExcalidrawPlugin = Plugin.define(meta).pipe(
  Common.Plugin.addSettingsModule({ id: 'settings', activate: ExcalidrawSettings }),
  Common.Plugin.addTranslationsModule({ translations }),
  Common.Plugin.addMetadataModule({
    metadata: {
      id: Diagram.Diagram.typename,
      metadata: {
        icon: 'ph--compass-tool--regular',
        iconHue: 'indigo',
        createObjectIntent: (() => createIntent(SketchAction.Create)) satisfies CreateObjectIntent,
        addToCollectionOnCreate: true,
      },
    },
  }),
  Common.Plugin.addSchemaModule({ schema: [Diagram.Canvas, Diagram.Diagram] }),
  Common.Plugin.addSurfaceModule({ activate: ReactSurface }),
  Common.Plugin.addIntentResolverModule({ activate: IntentResolvers }),
  Plugin.make,
);

//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Common, Plugin } from '@dxos/app-framework';
import { Diagram } from '@dxos/plugin-sketch/types';
import { type CreateObject } from '@dxos/plugin-space/types';

import { ExcalidrawSettings, IntentResolvers, OperationResolver, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';

export const ExcalidrawPlugin = Plugin.define(meta).pipe(
  Common.Plugin.addSettingsModule({ id: 'settings', activate: ExcalidrawSettings }),
  Common.Plugin.addTranslationsModule({ translations }),
  Common.Plugin.addMetadataModule({
    metadata: {
      id: Diagram.Diagram.typename,
      metadata: {
        icon: 'ph--compass-tool--regular',
        iconHue: 'indigo',
        createObject: ((props) => Effect.sync(() => Diagram.make(props))) satisfies CreateObject,
        addToCollectionOnCreate: true,
      },
    },
  }),
  Common.Plugin.addSchemaModule({ schema: [Diagram.Canvas, Diagram.Diagram] }),
  Common.Plugin.addSurfaceModule({ activate: ReactSurface }),
  Common.Plugin.addIntentResolverModule({ activate: IntentResolvers }),
  Common.Plugin.addOperationResolverModule({ activate: OperationResolver }),
  Plugin.make,
);
